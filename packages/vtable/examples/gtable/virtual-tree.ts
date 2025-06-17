import * as VTable from '../../src';
import { TreeListIndexConvertor } from './utils/TreeListIndexConvertor';
// import records_ from '../mock/table/flat-tree_3.json';
// import records_ from '../mock/table/flat-tree_100.json';
// import records_ from '../mock/table/flat-tree_7x5_98k.json';
import records_ from '../mock/table/flat-tree_8x5_488k.json';

const records = records_ as any[];

const CONTAINER_ID = 'vTable';

const convertor = new TreeListIndexConvertor(records);
// @ts-ignore
window.convertor = convertor;

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
      width: '200'
    },
    {
      field: 'id',
      title: 'id',
      width: '200'
    },
    {
      field: 'logRow',
      cellType: 'button',
      text: 'log row',
      width: '100',
      style: {
        color: '#FFF',
        buttonStyle: {
          buttonColor: '#8D6F64'
        }
      }
    }
  ];
  const option: VTable.ListTableConstructorOptions = {
    container: document.getElementById(CONTAINER_ID),
    // records,
    columns
    // plugins: [columnSeries, rowSeries],
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
        logRow(e);
    }
  });
}

const cacheCachedDataSource = new VTable.data.CachedDataSource({
  get(index) {
    const timeBegin = performance.now();
    const dataIndex = convertor.rowToIndex(index);
    // console.log(`dataIndex: ${dataIndex}`);
    if (dataIndex === null) {
      // console.log(`get ${index} with null`);
      return null;
    }
    const timeEnd = performance.now();
    // console.log(`get ${index} time: ${timeEnd - timeBegin}ms`);
    const result = records[dataIndex];
    // console.log(`get ${index} with ${JSON.stringify(result)}`);
    return result;
  },
  added(index: number, count: number) {
    // console.log(`added ${index} ${count}`);
    // this.length += count;
  },
  deleted(index: number[]) {
    // console.log(`deleted ${index}`);
    // this.length -= index.length;
  },
  length: records.length //all records count
});

function toggleTreeNode(e) {
  console.log('toggleTreeNode', e);

  const { row: row_, col } = e;
  const row = row_ - 1; // 减去表头
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
    tableInstance.addRecords(recordsToAdd, row + 1);
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
