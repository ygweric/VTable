/* eslint-disable */
import * as VTable from '../../src';
import VChart from '@visactor/vchart';
import { bindDebugTool } from '../../src/scenegraph/debug-tool';

import records from '../mock/table/file_10w_Tree.json';
// import records from '../mock/table/file_49w_Tree.json';
// import records from '../mock/table/file_107w_Tree.json';

const CONTAINER_ID = 'vTable';
VTable.register.chartModule('vchart', VChart);
export function createTable() {
  const columns = [
    {
      field: 'group',
      title: 'department',
      width: 'auto',
      tree: true,
      fieldFormat(rec: { [x: string]: any }) {
        return rec['department'] ?? rec['group'] ?? rec['name'];
      }
    },
    {
      field: 'id',
      title: 'ID',
      width: 80,
      sort: true
    },
    {
      field: 'email1',
      title: 'email',
      width: 250,
      sort: false
    },
    {
      field: 'full name',
      title: 'Full name',
      columns: [
        {
          field: 'name',
          title: 'First Name',
          width: 120
        },
        {
          field: 'lastName',
          title: 'Last Name',
          width: 100
        }
      ]
    },
    {
      field: 'hobbies',
      title: 'hobbies',
      width: 200
    },
    {
      field: 'birthday',
      title: 'birthday',
      width: 120
    },
    {
      field: 'sex',
      title: 'sex',
      width: 100
    },
    {
      field: 'tel',
      title: 'telephone',
      width: 150
    },
    {
      field: 'work',
      title: 'job',
      width: 200
    },
    {
      field: 'city',
      title: 'city',
      width: 150
    }
  ];

  const option = {
    // records:data,
    records: records,
    columns,
    hierarchyExpandLevel: 10,
    widthMode: 'standard'
  };
  const tableInstance = new VTable.ListTable(document.getElementById(CONTAINER_ID), option);
  window['tableInstance'] = tableInstance;
}
