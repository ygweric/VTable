import * as VTable from '@visactor/vtable';
/**
 * 添加行和列的插件的配置选项
 */
export interface FormulaCellOptions {
  /**
   * 是否启用添加列
   */
  addColumnEnable?: boolean;
  /**
   * 添加列的回调函数
   */
  addColumnCallback?: (col: number) => void;
}
export class FormulaCellPlugin implements VTable.plugins.IVTablePlugin {
  id = `formula-cell-${Date.now()}`;
  name = 'Formula Cell';
  runTime = [
    VTable.TABLE_EVENT_TYPE.MOUSEENTER_CELL,
    VTable.TABLE_EVENT_TYPE.MOUSELEAVE_CELL,
    VTable.TABLE_EVENT_TYPE.MOUSELEAVE_TABLE
  ];
  pluginOptions: FormulaCellOptions;
  table: VTable.ListTable;
  hoverCell: VTable.TYPES.CellAddressWithBound;

  constructor(
    pluginOptions: FormulaCellOptions = {
      addColumnEnable: true
    }
  ) {
    this.pluginOptions = pluginOptions;
    this.pluginOptions.addColumnEnable = this.pluginOptions.addColumnEnable ?? true;
  }
  run(...args: any[]) {
    const eventArgs = args[0];
    const runTime = args[1];
    const table: VTable.BaseTableAPI = args[2];
    this.table = table as VTable.ListTable;
    if (runTime === VTable.TABLE_EVENT_TYPE.MOUSEENTER_CELL) {
    } else if (runTime === VTable.TABLE_EVENT_TYPE.MOUSELEAVE_CELL) {
    } else if (runTime === VTable.TABLE_EVENT_TYPE.MOUSELEAVE_TABLE) {
    }
  }
  // #region 添加列
  // #endregion
  release() {
    this.table = null;
  }
}
