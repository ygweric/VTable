import * as VTable from '@visactor/vtable';
import { InputEditor } from '@visactor/vtable-editors';
import { bindDebugTool } from '@visactor/vtable/es/scenegraph/debug-tool';
import {
  FormulaCellPlugin,
  FormulaEditor,
  // ColumnSeriesPlugin,
  RowSeriesPlugin,
  HighlightHeaderWhenSelectCellPlugin
} from '../../src';
const CONTAINER_ID = 'vTable';

const formulaMap: Record<string, any> = {};
const inputEditor = new InputEditor();
const formulaEditor = new FormulaEditor({
  getInitExpression: (position, table) => {
    return formulaMap[`${position.col}_${position.row}`] ?? ``;
  },
  onEditSuccess: (position, value, expression) => {
    // 更新依赖单元格
    const { col, row } = position;
    formulaMap[`${col}_${row}`] = expression;
    // table.changeCellValue(col, row, value + expression);
  }
});
VTable.register.editor('inputEditor', inputEditor);
VTable.register.editor('formulaEditor', formulaEditor);

const generatePersons = count => {
  return Array.from(new Array(count)).map((_, i) => {
    const row = i + 1;
    const formulaValue = `=A${row}+B${row}`;
    formulaMap[`${3}_${row}`] = formulaValue;
    return {
      count: 5 + i,
      price: 10 + i,
      total: formulaValue
    };
  });
};
const records = generatePersons(20);

// records.forEach((record, index) => {
//   const row = index + 1;
//   formulaMap[`${3}*${row}`] = `A${row}*B${row}`;
// });

export function createTable() {
  const formulaCellPlugin = new FormulaCellPlugin({});
  // const columnSeries = new ColumnSeriesPlugin({
  //   columnCount: 100,
  //   generateColumnField: index => {
  //     switch (index) {
  //       case 0:
  //         return 'count';
  //       case 1:
  //         return 'price';
  //       case 2:
  //         return 'total';
  //       default:
  //         return ``;
  //     }
  //   }
  // });
  const rowSeries = new RowSeriesPlugin({
    rowCount: 10
  });
  const highlightPlugin = new HighlightHeaderWhenSelectCellPlugin({
    colHighlight: true,
    rowHighlight: true
  });

  const columns: VTable.ColumnsDefine = [
    {
      field: 'count',
      title: '数量(A)',
      width: 200,
      disableColumnResize: true
    },
    {
      field: 'price',
      title: '单价(B)',
      width: 200,
      editor: 'inputEditor',
      disableColumnResize: true
    },
    {
      field: 'total',
      title: '总价(C)',
      width: 400,
      disableColumnResize: true,
      editor: 'formulaEditor'
    }
  ];
  const option: VTable.ListTableConstructorOptions = {
    container: document.getElementById(CONTAINER_ID),
    records,
    columns,
    select: {
      headerSelectMode: 'cell'
    },

    plugins: [
      formulaCellPlugin,
      // columnSeries,
      rowSeries,
      highlightPlugin
      //
    ]
  };
  const tableInstance = new VTable.ListTable(option);
  // @ts-ignore
  window.tableInstance = tableInstance;
  bindDebugTool(tableInstance.scenegraph.stage, {
    customGrapicKeys: ['col', 'row']
  });
}
