import * as VTable from '../../src';
import records from '../mock/table/flat-tree_0k.json';

const CONTAINER_ID = 'vTable';

export function createTable() {
  // create DataSource
  const loadedData = {};
  const dataSource = new VTable.data.CachedDataSource({
    get(index) {
      // console.log('get', index);

      return records[index];
    },
    added(index: number, count: number) {
      this.length += count;
    },
    deleted(index: number[]) {
      this.length -= index.length;
    },
    length: records.length //all records count
  });

  const columns: VTable.ColumnsDefine = [
    {
      field: 'treeId',
      title: 'treeId',
      width: '200',
      tree: true
    },
    {
      field: 'id',
      title: 'id',
      width: '200'
    }
  ];
  const option: VTable.ListTableConstructorOptions = {
    container: document.getElementById(CONTAINER_ID),
    // records,
    columns
  };
  const tableInstance = new VTable.ListTable(option);
  tableInstance.dataSource = dataSource;
  window.tableInstance = tableInstance;

  // bindDebugTool(tableInstance.scenegraph.stage, { customGrapicKeys: ['col', 'row'] });
}
