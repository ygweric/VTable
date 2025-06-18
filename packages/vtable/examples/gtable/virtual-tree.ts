import * as VTable from '../../src';
import { InputEditor } from '@visactor/vtable-editors';
import { TreeListIndexConvertor } from './convertor/TreeListIndexConvertor';
import { AddRowColumnPlugin } from './plugin/add-row-column';
import { ColumnSeriesPlugin } from './plugin/column-series';
import { RowSeriesPlugin } from './plugin/row-series';
// import records_ from '../mock/table/flat-tree_1.json';
import records_ from '../mock/table/flat-tree_3.json';
// import records_ from '../mock/table/flat-tree_100.json';
// import records_ from '../mock/table/flat-tree_7x5_98k.json';
// import records_ from '../mock/table/flat-tree_8x5_488k.json';
// import records_ from '../mock/table/flat-tree_9x5_1015k.json';
// import records_ from '../mock/table/flat-tree_9x5_2441k.json';

const records = records_ as any[];

const input_editor = new InputEditor();
VTable.register.editor('input-editor', input_editor);

const CONTAINER_ID = 'vTable';

const convertor = new TreeListIndexConvertor(records);
// @ts-ignore
window.convertor = convertor;

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
      field: 'treeId',
      cellType: 'button',
      text: ({ row, col, table, value, dataValue, percentile, cellHeaderPaths }) => {
        // console.log('text', row, col, table, value, dataValue, percentile, cellHeaderPaths);
        // console.log('treeId-column', row, col, value, dataValue);
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
      field: 'treeId',
      title: 'treeId',
      editor: 'input-editor',
      width: '200'
    },
    {
      field: 'id',
      title: 'id',
      editor: 'input-editor',
      width: '200'
    },
    {
      field: 'treeId',
      cellType: 'button',
      text: ({ row, col, table, value, dataValue, percentile, cellHeaderPaths }) => {
        switch (value) {
          case '1':
            return `add child under ${value}`;
          case '1.1':
            return `remove ${value}`;
          case '1.1.1':
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

  const addRowColumn = new AddRowColumnPlugin({
    // addRowCallback: row => {
    //   // todo
    // }
  });

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
        const record = records[dataIndex];
        switch (record.treeId) {
          case '1':
            {
              const newRecord = { id: 19, treeId: '1.9' };
              if (convertor.addNode(newRecord, e.row + 1)) {
                tableInstance.addRecords([newRecord], e.row + 1);
              }
            }

            break;
          case '1.1':
            {
              const rowsToRemove = convertor.removeNode('1.1');
              tableInstance.deleteRecords(rowsToRemove);
            }

            break;
          case '1.1.1':
            {
              const rowsToRemove = convertor.removeNode('1.1.1');
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
      console.log(`get ${index} with null`);
      return null;
    }
    const record = records[dataIndex];
    console.log(`get ${index} with ${JSON.stringify(record)}`); // -------------------------------------------------------------
    return record;
  },
  added(index: number, count: number) {
    // console.log(`added ${index} ${count}`);
    // this.length += count;
  },
  deleted(index: number[]) {
    // console.log(`deleted ${index}`);
    // this.length -= index.length;
  },
  changeFieldValue(value, index, field, col, row, table) {
    // 获取原始数据在 records 数组中的索引
    const dataIndex = convertor.rowToIndex(index as number);
    if (dataIndex === null || dataIndex < 0 || dataIndex >= records.length) {
      console.warn(`Invalid dataIndex: ${dataIndex} for table index: ${index}`);
      return value;
    }

    // 直接修改原始数据数组中的记录
    const record = records[dataIndex];
    if (record) {
      // 处理字段名
      let fieldKey = field;
      if (field === undefined || field === '') {
        fieldKey = col! - (table?.leftRowSeriesNumberCount || 0);
      }

      // 类型转换 - 如果原值是数字且新值是数字字符串，则转换为数字
      let formatValue = value;
      const originalValue = record[fieldKey as string];
      if (typeof originalValue === 'number' && typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
        formatValue = parseFloat(value);
      }

      record[fieldKey as string] = formatValue;
      console.log(`Changed field ${fieldKey} to ${formatValue} for record at dataIndex ${dataIndex}`);
    } else {
      console.warn(`Record not found at dataIndex: ${dataIndex}`);
    }

    return value;
  },
  length: records.length //all records count
});

function toggleTreeNode(e) {
  console.log('toggleTreeNode', e);

  const { row: row_, col } = e;
  const row = row_; // 减去表头
  const flatTreeIndex = convertor.rowToIndex(row);
  const record = records[flatTreeIndex as number];
  const treeId = record.treeId;

  const isCollapsed = convertor.isCollapsed(treeId);
  console.log(`row:${row} -> flatTreeIndex:${flatTreeIndex} -> treeId:${treeId} -> isCollapsed: ${isCollapsed}`);
  const descendantNodesToDelete = convertor.getDescendantNodes(treeId);
  // console.log(
  //   `descendanToDelete: `,
  //   descendantNodesToDelete.map(item => `rowIndex: ${item.rowIndex} treeId: ${item.data.treeId}`)
  // );
  if (!isCollapsed) {
    const idsToDelete = descendantNodesToDelete
      .filter(item => item.rowIndex !== null)
      .map(item => item.rowIndex as number);
    console.log(`idsToDelete: ${idsToDelete.length}`);

    convertor.setCollapsed(treeId, !isCollapsed);
    tableInstance.deleteRecords(idsToDelete);
  } else {
    const recordsToAdd = descendantNodesToDelete.map(item => item.data);
    console.log(`recordsToAdd: ${recordsToAdd.length}`);

    convertor.setCollapsed(treeId, !isCollapsed);
    tableInstance.addRecords(recordsToAdd, row);
  }
  console.log('updateRecords', record, row_);
  // tableInstance.updateRecords([{ ...record, id: 123 }], [row_]);
  // 必须调用changeCellValue，column的text回调函数被调用更新
  tableInstance.changeCellValue(0, row_, treeId);

  // convertor.toggleCollapsed(treeId);

  // dataSource.setRecord(records[row], row);
}
function logRow(e) {
  console.log('logRow', e);
}
