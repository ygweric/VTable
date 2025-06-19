import * as VTable from '../../src';
import { InputEditor } from '@visactor/vtable-editors';
import TreeListIndexConvertor from './convertor/TreeListIndexConvertor';
import { AddRowColumnPlugin } from './plugin/add-row-column';
import { ColumnSeriesPlugin } from './plugin/column-series';
import { RowSeriesPlugin } from './plugin/row-series';
// import records_ from '../mock/table/flat-tree_1.json';
// import records_ from '../mock/table/flat-tree_3.json';
// import records_ from '../mock/table/flat-tree_100.json';
// import records_ from '../mock/table/flat-tree_7x5_98k.json';
// import records_ from '../mock/table/flat-tree_8x5_488k.json';
// import records_ from '../mock/table/flat-tree_9x5_1015k.json';
// import records_ from '../mock/table/flat-tree_9x5_2441k.json';

// import records_ from '../mock/table/flat-tree_v4_4x3_121.json';
// import records_ from '../mock/table/flat-tree_v4_7x5_98k.json';
// import records_ from '../mock/table/flat-tree_v4_8x5_488k.json';
import records_ from '../mock/table/flat-tree_v4_9x5_1016k.json';

// 临时使用模拟数据，您可以替换为实际的新格式数据文件
// const records = [
//   { id: 1, parentId: null },
//   { id: 2, parentId: 1 },
//   { id: 3, parentId: 2 },
//   { id: 4, parentId: 2 },
//   { id: 5, parentId: 1 },
//   { id: 6, parentId: null },
//   { id: 7, parentId: 6 },
//   { id: 8, parentId: 6 }
// ] as any[];

const records = records_;

const input_editor = new InputEditor();
VTable.register.editor('input-editor', input_editor);

const CONTAINER_ID = 'vTable';

const convertor = new TreeListIndexConvertor(records);
// @ts-ignore
window.convertor = convertor;

// 不再使用 window 对象，而是通过插件回调传递

// 创建 ColumnSeries 插件实例
const columnSeries = new ColumnSeriesPlugin({
  columnCount: 5 // 设置列数量
});

// 创建 RowSeries 插件实例
const rowSeries = new RowSeriesPlugin({
  rowCount: 100 // 设置行数量
});

let tableInstance: VTable.ListTable;
export function createTable() {
  const columns: VTable.ColumnsDefine = [
    {
      field: 'id',
      cellType: 'button',
      text: ({ row, col, table, value, dataValue, percentile, cellHeaderPaths }) => {
        // console.log('text', row, col, table, value, dataValue, percentile, cellHeaderPaths);
        // console.log('id-column', row, col, value, dataValue);
        const isCollapsed = convertor.isCollapsed(dataValue);
        if (isCollapsed) {
          return '>';
        } else {
          return 'v';
        }
      },
      width: '100',
      style: {
        color: '#FFF',
        buttonStyle: {
          buttonColor: '#FE9900'
        }
      }
    },
    {
      field: 'id',
      title: 'id',
      editor: 'input-editor',
      width: '200'
    },
    {
      field: 'parentId',
      title: 'parentId',
      editor: 'input-editor',
      width: '200'
    },
    {
      field: 'parents',
      title: 'parents',
      editor: 'input-editor',
      width: '200'
    },
    {
      field: 'id',
      cellType: 'button',
      text: ({ row, col, table, value, dataValue, percentile, cellHeaderPaths }) => {
        switch (value) {
          case 1:
            return `add child under ${value}`;
          case 2:
            return `remove ${value}`;
          case 3:
            return `remove ${value}`;
          default:
            return 'log row info';
        }
      },
      width: '200',
      style: {
        color: '#FFF',
        buttonStyle: {
          buttonColor: '#8D6F64'
        }
      }
    }
  ];

  const addRowColumn = new AddRowColumnPlugin({});

  const option: VTable.ListTableConstructorOptions = {
    showHeader: false,
    dragOrder: {
      dragHeaderMode: 'all'
    },
    container: document.getElementById(CONTAINER_ID),
    columns,
    plugins: [
      addRowColumn
      // columnSeries,
      // rowSeries
    ]
  };
  tableInstance = new VTable.ListTable(option);
  tableInstance.dataSource = cacheCachedDataSource;
  window['tableInstance'] = tableInstance;

  tableInstance.on(VTable.ListTable.EVENT_TYPE.BUTTON_CLICK, e => {
    // console.log(`${VTable.ListTable.EVENT_TYPE.BUTTON_CLICK}, ${e.col}, ${e.row}`);
    switch (e.col) {
      case 0:
        toggleTreeNode(e);
        break;
      case 3:
        const dataIndex = convertor.rowToIndex(e.row);
        const record = records[dataIndex as number];
        switch (record.id) {
          case 1:
            {
              const newRecord = { id: 19, parentId: 1 };
              if (convertor.addNode(newRecord, e.row + 1)) {
                tableInstance.addRecords([newRecord], e.row + 1);
              }
            }

            break;
          case 2:
            {
              const rowsToRemove = convertor.removeNode(2);
              tableInstance.deleteRecords(rowsToRemove);
            }

            break;
          case 3:
            {
              const rowsToRemove = convertor.removeNode(3);
              tableInstance.deleteRecords(rowsToRemove);
            }

            break;
          default:
            logRow(e);
        }
    }
  });
}

const cacheCachedDataSource = new VTable.data.CachedDataSource({
  get(index) {
    const dataIndex = convertor.rowToIndex(index);
    if (dataIndex === null) {
      // console.log(`get ${index} with null`);
      return null;
    }
    const record = records[dataIndex];
    // console.log(`get ${index} with ${JSON.stringify(record)}`); // -------------------------------------------------------------
    return record;
  },
  changeFieldValue(value, index, field, col, row, table) {
    // todo
  },

  length: records.length //all records count
});

function toggleTreeNode(e) {
  console.log('toggleTreeNode', e);

  const { row: row_, col } = e;
  const row = row_; // 减去表头
  const flatTreeIndex = convertor.rowToIndex(row);
  const record = records[flatTreeIndex as number];
  const id = record.id;

  const isCollapsed = convertor.isCollapsed(id);
  console.log(`row:${row} -> flatTreeIndex:${flatTreeIndex} -> id:${id} -> isCollapsed: ${isCollapsed}`);
  const descendantNodesToDelete = convertor.getDescendantNodes(id);
  // console.log(
  //   `descendanToDelete: `,
  //   descendantNodesToDelete.map(item => `rowIndex: ${item.rowIndex} id: ${item.data.id}`)
  // );
  if (!isCollapsed) {
    const idsToDelete = descendantNodesToDelete
      .filter(item => item.rowIndex !== null)
      .map(item => item.rowIndex as number);
    console.log(`idsToDelete: ${idsToDelete.length}`);

    convertor.setCollapsed(id, !isCollapsed);
    tableInstance.deleteRecords(idsToDelete);
  } else {
    const recordsToAdd = descendantNodesToDelete.map(item => item.data);
    console.log(`recordsToAdd: ${recordsToAdd.length}`);

    convertor.setCollapsed(id, !isCollapsed);
    tableInstance.addRecords(recordsToAdd, row);
  }
  console.log('updateRecords', record, row_);
  // tableInstance.updateRecords([{ ...record, id: 123 }], [row_]);
  // 必须调用changeCellValue，column的text回调函数被调用更新
  tableInstance.changeCellValue(0, row_, id);

  // convertor.toggleCollapsed(id);

  // dataSource.setRecord(records[row], row);
}
function logRow(e) {
  console.log('logRow', e);
}
