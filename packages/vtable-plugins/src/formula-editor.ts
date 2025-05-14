import type * as VTable from '@visactor/vtable';
import type { ValidateEnum, CellAddress, EditContext, IEditor, RectProps } from '@visactor/vtable-editors';
import * as math from 'mathjs';

export interface FormulaEditorConfig {
  readonly?: boolean;
}

/**
 * 解析Excel单元格引用
 * @param cellRef 单元格引用
 * @returns 列号和行号
 */
function parseExcelCellReference(cellRef: string) {
  // 使用正则表达式分离列字母和行数字
  const match = cellRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`无效的单元格引用格式: ${cellRef}`);
  }

  const [, columnLetters, rowStr] = match;
  const row = parseInt(rowStr, 10);

  // 验证行号范围（Excel 2007+ 最大为1048576）
  if (row < 1 || row > 1048576) {
    throw new Error(`行号超出范围: ${row}`);
  }

  // 计算列号
  let col = 0;
  for (let i = 0; i < columnLetters.length; i++) {
    const char = columnLetters[i];
    // 将字符转换为数字 (A=1, B=2, ..., Z=26)
    const charValue = char.charCodeAt(0) - 64; // 'A' 的 Unicode 值是 65
    // 计算列号（类似于26进制，但每个位的权重从1开始而非0）
    col = col * 26 + charValue;
  }

  // 验证列号范围（Excel 2007+ 最大为XFD，即16384）
  if (col < 1 || col > 16384) {
    throw new Error(`列号超出范围: ${col}`);
  }

  return {
    row,
    col
  };
}

/**
 * 计算单元格值
 * @param value 单元格值
 * @param tableInstance 表格实例
 * @returns 计算结果
 */
function calculateFormulaCell(value: string, tableInstance?: VTable.ListTable) {
  // 如果是公式
  if (!value.startsWith('=')) {
    return value;
  }
  try {
    const expression = value.substring(1); // 去掉等号
    const result = evaluateFormula(expression, tableInstance);
    // eslint-disable-next-line no-console
    console.log('expression: ', expression, ', result: ', result);
    return result;
  } catch (error) {
    console.error('公式计算错误:', error);
    return `#ERROR!`;
  }
}

/**
 * 解析并计算公式
 * @param formula 公式
 * @param tableInstance 表格实例
 * @returns 计算结果
 */
function evaluateFormula(formula: string, tableInstance: VTable.ListTable) {
  // 替换单元格引用为实际值
  const parsedFormula = formula.replace(/([A-Z]+\d+)/g, (match: any, cellRef: any) => {
    const { col, row } = parseExcelCellReference(cellRef);
    const cellValue = tableInstance.getCellValue(col, row);
    return cellValue ?? 0;
  });

  // 使用mathjs计算表达式
  return math.evaluate(parsedFormula);
}

/**
 * 更新依赖单元格
 * @param changedCellId 改变的单元格
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function updateDependentCells(changedCellId: any) {
  // TODO: 更新依赖单元格
}

export class FormulaEditor implements IEditor {
  editorType: string = 'Formula';
  editorConfig: FormulaEditorConfig;
  container: HTMLElement;
  successCallback?: () => void;
  element: HTMLInputElement;
  finalValue: string;

  constructor(editorConfig?: FormulaEditorConfig) {
    this.editorConfig = editorConfig as FormulaEditorConfig;
  }

  createElement() {
    const input = document.createElement('input');
    input.setAttribute('type', 'text');

    if (this.editorConfig?.readonly) {
      input.setAttribute('readonly', `${this.editorConfig.readonly}`);
    }

    input.style.position = 'absolute';
    input.style.padding = '4px';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';
    input.style.backgroundColor = '#FFFFFF';
    input.style.borderRadius = '0px';
    input.style.border = '2px solid #d9d9d9';
    // #region 为了保证input在focus时，没有圆角
    input.addEventListener('focus', () => {
      input.style.borderColor = '#4A90E2';
      input.style.outline = 'none';
    });

    input.addEventListener('blur', () => {
      input.style.borderColor = '#d9d9d9';
      // input.style.boxShadow = 'none';
    });
    // #endregion
    this.element = input;
    this.container.appendChild(input);

    // 监听键盘事件
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        // 阻止冒泡  防止处理成表格全选事件
        e.stopPropagation();
      }
    });

    // hack for preventing drag touch cause page jump
    input.addEventListener('wheel', e => {
      e.preventDefault();
    });
  }

  setValue(value: string) {
    this.element.value = typeof value !== 'undefined' ? value : '';
  }

  getValue() {
    return this.finalValue;
  }

  onStart({ value, referencePosition, container, endEdit }: EditContext<string>) {
    this.container = container;
    this.successCallback = endEdit;
    if (!this.element) {
      this.createElement();

      if (value !== undefined && value !== null) {
        this.setValue(value);
      }
      if (referencePosition?.rect) {
        this.adjustPosition(referencePosition.rect);
      }
    }
    this.element.focus();
    // do nothing
  }

  adjustPosition(rect: RectProps) {
    //使border均分input位置rect的上下左右
    const borderWidth = 2;
    const top = rect.top - borderWidth / 2;
    const left = rect.left - borderWidth / 2;
    const width = rect.width + borderWidth;
    const height = rect.height + borderWidth;

    this.element.style.top = top + 'px';
    this.element.style.left = left + 'px';
    this.element.style.width = width + 'px';
    this.element.style.height = height + 'px';
  }

  endEditing() {
    // do nothing
  }

  onEnd() {
    // do nothing
    if (this.container?.contains(this.element)) {
      this.container.removeChild(this.element);
    }
    // @ts-ignore
    this.element = undefined;
  }

  isEditorElement(target: HTMLElement) {
    return target === this.element;
  }

  validateValue(newValue?: any, oldValue?: any, position?: CellAddress, table?: any): boolean | ValidateEnum {
    const realNewValue = this.element.value;
    if (!realNewValue.startsWith('=')) {
      // 不是公式，直接返回true
      return true;
    }

    try {
      this.finalValue = calculateFormulaCell(realNewValue, table);
      return true;
    } catch (error) {
      return false;
    }
  }
}
