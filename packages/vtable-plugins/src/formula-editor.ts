import type * as VTable from '@visactor/vtable';
import type { ValidateEnum, CellAddress, EditContext, IEditor, RectProps } from '@visactor/vtable-editors';
import * as math from 'mathjs';

// TODO: 更新依赖单元格
// TODO: 解决循环引用

export interface FormulaEditorConfig {
  readonly?: boolean;
  /**
   * 编辑成功回调, 更新外部表达式存储单元
   * @param position 单元格位置
   * @param value 单元格值
   * @param expression 表达式
   * @param table 表格实例
   */
  onEditSuccess?: (position: CellAddress, value: string, expression: string, table: VTable.ListTable) => void;
  /**
   * 获取初始函数表达式，
   * @param position 单元格位置
   * @param table 表格实例
   * @returns 初始表达式
   */
  getInitExpression?: (position: CellAddress, table: VTable.ListTable) => string;
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
  const expression = value.substring(1); // 去掉等号
  const result = evaluateFormula(expression, tableInstance);
  // eslint-disable-next-line no-console
  console.log('expression: ', expression, ', result: ', result);
  return result;
  // try {
  // } catch (error) {
  //   console.error('公式计算错误:', error);
  //   return `#ERROR!`;
  // }
}

/**
 * 解析并计算公式
 * @param formula 公式
 * @param tableInstance 表格实例
 * @returns 计算结果
 */
function evaluateFormula(formula: string, tableInstance: VTable.ListTable) {
  // 替换单元格引用为实际值
  const parsedFormula = formula.toUpperCase().replace(/([A-Z]+\d+)/g, (match: any, cellRef: any) => {
    const { col, row } = parseExcelCellReference(cellRef);
    const cellValue = tableInstance.getCellValue(col, row);
    return cellValue ?? 0;
  });

  // 使用mathjs计算表达式
  return math.evaluate(parsedFormula);
}

export class FormulaEditor implements IEditor {
  editorType: string = 'Formula';
  editorConfig: FormulaEditorConfig;
  container: HTMLElement;
  onEditSuccess?: () => void;
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
    this.element.value = value ?? '';
  }

  getValue() {
    return this.finalValue;
  }

  onStart({ value, referencePosition, container, endEdit, table, col, row }: EditContext<string>) {
    this.container = container;
    this.onEditSuccess = endEdit;
    if (!this.element) {
      this.createElement();

      if (this.editorConfig?.getInitExpression) {
        this.setValue(this.editorConfig?.getInitExpression?.({ col, row }, table));
      } else {
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

  validateValue(_?: any, oldValue?: any, position?: CellAddress, table?: any): boolean | ValidateEnum {
    const newValue = this.element.value;
    if (!newValue.startsWith('=')) {
      // 不是公式，直接返回true
      return true;
    }

    try {
      this.finalValue = calculateFormulaCell(newValue, table);
      this.editorConfig?.onEditSuccess?.(position, this.finalValue, newValue, table);
      return true;
    } catch (error) {
      console.error('公式计算错误:', error);
      return false;
    }
  }
}
