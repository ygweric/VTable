/* eslint-disable */
import * as VTable from '../../src';
import VChart from '@visactor/vchart';

import records from '../mock/table/level-tree_0k.json';

const CONTAINER_ID = 'vTable';
VTable.register.chartModule('vchart', VChart);
export function createTable() {
  const columns = [
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

  const option = {
    records: records,
    columns,
    hierarchyExpandLevel: 10,
    widthMode: 'standard'
  } as VTable.ListTableConstructorOptions;
  const tableInstance = new VTable.ListTable(document.getElementById(CONTAINER_ID) as HTMLElement, option);
  window['tableInstance'] = tableInstance;
}
