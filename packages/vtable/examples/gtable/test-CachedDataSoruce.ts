import * as VTable from '../../src';
import { bindDebugTool } from '../../src/scenegraph/debug-tool';

const CONTAINER_ID = 'vTable';

const generatePersons = i => {
  return {
    id: i + 1,
    email1: `${i + 1}@xxx.com`,
    date1: new Date().toISOString()
  };
};

// @ts-ignore
window.generatePersons = generatePersons;

export function createTable() {
  const cachedDataSourceConfig = {
    get(index) {
      console.log(`get ${index}`);

      return generatePersons(index);
    },
    added(index: number, count: number) {
      console.log(`added ${index} ${count}`);
      // this.length += count;
    },
    deleted(index: number[]) {
      console.log(`deleted ${index}`);
      // this.length -= index.length;
    },
    _length: 5 //all records count
  };

  // 定义访问器属性
  Object.defineProperty(cachedDataSourceConfig, 'length', {
    get() {
      console.log(`读取 length 属性: ${this._length}`);
      // return this._length;
      return 5;
    },
    set(value) {
      console.log(`length 属性变化: ${this._length} → ${value}`);
      this._length = value;
      // 这里可以添加其他监听逻辑
    }
  });
  // console.log(`cachedDataSourceConfig.length: ${(cachedDataSourceConfig as any).length}`);

  const cacheCachedDataSource = new VTable.data.CachedDataSource(cachedDataSourceConfig);

  const columns: VTable.ColumnsDefine = [
    {
      field: 'id',
      title: 'ID',
      width: 120
      // sort: true
    },
    {
      field: 'email1',
      title: 'email',
      width: 200
      // sort: true
    },
    {
      field: 'date1',
      title: 'birthday',
      width: 300
    }
  ];
  const option: VTable.ListTableConstructorOptions = {
    container: document.getElementById(CONTAINER_ID),
    // records,
    columns
  };
  const tableInstance = new VTable.ListTable(option);
  tableInstance.dataSource = cacheCachedDataSource;
  // @ts-ignore
  window.tableInstance = tableInstance;

  // bindDebugTool(tableInstance.scenegraph.stage, { customGrapicKeys: ['col', 'row'] });
}
