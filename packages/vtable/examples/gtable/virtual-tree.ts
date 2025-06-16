import * as VTable from '../../src';
import records from '../mock/table/flat-tree_0k.json';
import { TreeListIndexConvertor } from './utils/TreeListIndexConvertor';

const CONTAINER_ID = 'vTable';

const convertor = new TreeListIndexConvertor(records);
// @ts-ignore
window.convertor = convertor;

let tableInstance: VTable.ListTable;
export function createTable() {
  const columns: VTable.ColumnsDefine = [
    {
      field: 'button',
      cellType: 'button',
      text: '展开/折叠',
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
        switch (e.row) {
          case 1:
            testConvert(e);
            break;
          default:
            logRow(e);
        }
    }
  });
}

const cacheCachedDataSource = new VTable.data.CachedDataSource({
  get(index) {
    console.log(`get ${index}`);
    const dataIndex = convertor.rowToIndex(index);
    console.log(`dataIndex: ${dataIndex}`);
    if (dataIndex === null) {
      return null;
    }
    return records[dataIndex];
  },
  added(index: number, count: number) {
    console.log(`added ${index} ${count}`);
    // this.length += count;
  },
  deleted(index: number[]) {
    console.log(`deleted ${index}`);
    // this.length -= index.length;
  },
  length: records.length //all records count
});

function toggleTreeNode(e) {
  console.log('toggleTreeNode', e);

  const { row: row_, col } = e;
  const row = row_ - 1;
  const flatTreeIndex = convertor.rowToIndex(row);
  const treeId = records[flatTreeIndex as number].treeId;

  const isCollapsed = convertor.isCollapsed(treeId);
  console.log(`row:${row} -> flatTreeIndex:${flatTreeIndex} -> treeId:${treeId} -> isCollapsed: ${isCollapsed}`);
  const descendantNodesToDelete = convertor.getDescendantNodes(treeId);
  console.log(
    `descendanToDelete: `,
    descendantNodesToDelete.map(item => `rowIndex: ${item.rowIndex} treeId: ${item.data.treeId}`)
  );
  if (!isCollapsed) {
    const idsToDelete = descendantNodesToDelete
      .filter(item => item.rowIndex !== null)
      .map(item => item.rowIndex as number);

    convertor.setCollapsed(treeId, !isCollapsed);
    tableInstance.deleteRecords(idsToDelete);
  } else {
    const recordsToAdd = descendantNodesToDelete.map(item => item.data);

    convertor.setCollapsed(treeId, !isCollapsed);
    tableInstance.addRecords(recordsToAdd, row + 1);
  }

  // convertor.toggleCollapsed(treeId);

  // dataSource.setRecord(records[row], row);
}
function logRow(e) {
  console.log('logRow', e);
}
function testConvert(e) {
  console.log('testConvert', e);

  /**
   * 使用示例：树形数据行号与索引转换工具
   */

  // 示例数据 - 模拟真实的树形数据
  const treeListData = [
    { id: 1, treeId: '1', name: '根节点1' },
    { id: 2, treeId: '1.1', name: '子节点1.1' },
    { id: 3, treeId: '1.1.1', name: '子节点1.1.1' },
    { id: 4, treeId: '1.1.2', name: '子节点1.1.2' },
    { id: 5, treeId: '1.2', name: '子节点1.2' },
    { id: 6, treeId: '1.2.1', name: '子节点1.2.1' },
    { id: 7, treeId: '2', name: '根节点2' },
    { id: 8, treeId: '2.1', name: '子节点2.1' },
    { id: 9, treeId: '2.1.1', name: '子节点2.1.1' },
    { id: 10, treeId: '2.1.2', name: '子节点2.1.2' }
  ];

  console.log('🌳 树形数据转换工具使用示例\n');

  // 1. 创建转换器实例
  const convertor = new TreeListIndexConvertor(treeListData);

  console.log('📊 初始数据（全部展开）:');
  console.log('- 总数据条数:', treeListData.length);
  console.log('- 可见行数:', convertor.getVisibleRowCount());
  console.log('- 第3行对应的数据:', treeListData[convertor.rowToIndex(3) as number]);
  console.log('');

  // 2. 折叠某个节点
  console.log('📁 折叠节点 "1.1":');
  convertor.setCollapsed('1.1', true);
  console.log('- 可见行数:', convertor.getVisibleRowCount());
  console.log('- 可见数据列表:');
  convertor.getVisibleData().forEach((item, rowIndex) => {
    console.log(`  行号${rowIndex}: ${item.name} (数组索引: ${convertor.rowToIndex(rowIndex)})`);
  });
  console.log('');

  // 3. 双向转换示例
  console.log('🔄 双向转换示例:');
  console.log('- 行号2 -> 数组索引:', convertor.rowToIndex(2));
  console.log('- 数组索引2 -> 行号:', convertor.indexToRow(2), '(被折叠，返回null)');
  console.log('- 数组索引5 -> 行号:', convertor.indexToRow(5));
  console.log('');

  // 4. 模拟UI交互 - 用户点击table第1行
  console.log('🖱️ 模拟UI交互 - 用户点击table第1行:');
  const clickedRowIndex = 1;
  const actualDataIndex = convertor.rowToIndex(clickedRowIndex);
  const clickedData = treeListData[actualDataIndex as number];
  console.log(`- 用户点击: 第${clickedRowIndex}行`);
  console.log(`- 实际数据索引: ${actualDataIndex}`);
  console.log(`- 对应数据: ${clickedData.name} (treeId: ${clickedData.treeId})`);
  console.log('');

  // 5. 继续折叠其他节点
  console.log('📁 再折叠节点 "2":');
  convertor.setCollapsed('2', true);
  console.log('- 可见行数:', convertor.getVisibleRowCount());
  console.log('- 此时可见的数据:');
  convertor.getVisibleData().forEach((item, index) => {
    console.log(`  ${index}: ${item.name}`);
  });
  console.log('');

  // 6. 展开节点
  console.log('📂 展开节点 "1.1":');
  convertor.setCollapsed('1.1', false);
  console.log('- 可见行数:', convertor.getVisibleRowCount());
  console.log('');

  // 7. 切换折叠状态
  console.log('🔄 切换节点 "1.2" 的折叠状态:');
  const newState = convertor.toggleCollapsed('1.2');
  console.log(`- 新状态: ${newState ? '折叠' : '展开'}`);
  console.log('- 可见行数:', convertor.getVisibleRowCount());
  console.log('');

  // 8. 获取调试信息
  console.log('🔍 调试信息:');
  const debugInfo = convertor.getDebugInfo();
  console.log('- 总条数:', debugInfo.totalItems);
  console.log('- 可见条数:', debugInfo.visibleItems);
  console.log('- 已折叠节点:', debugInfo.collapsedNodes);
  console.log('- 缓存版本:', debugInfo.cacheVersion);
  console.log('');

  // 9. 全部展开
  console.log('🌟 全部展开:');
  convertor.expandAll();
  console.log('- 可见行数:', convertor.getVisibleRowCount());
  console.log('');

  // 10. 实际使用场景示例函数
  console.log('💡 实际使用场景示例:');

  /**
   * 处理table行点击事件
   */
  function handleTableRowClick(rowIndex) {
    const dataIndex = convertor.rowToIndex(rowIndex);
    if (dataIndex !== null) {
      const data = treeListData[dataIndex];
      console.log(`点击了第${rowIndex}行，对应数据: ${data.name}`);

      // 如果是可折叠的节点，可以切换折叠状态
      if (hasChildren(data.treeId)) {
        const collapsed = convertor.toggleCollapsed(data.treeId);
        console.log(`${data.name} 已${collapsed ? '折叠' : '展开'}`);
        return convertor.getVisibleRowCount(); // 返回新的可见行数，用于更新UI
      }
    }
    return convertor.getVisibleRowCount();
  }

  /**
   * 检查节点是否有子节点
   */
  function hasChildren(treeId) {
    return treeListData.some(item => item.treeId !== treeId && item.treeId.startsWith(treeId + '.'));
  }

  // 示例调用
  console.log('- 模拟点击第1行:');
  const newVisibleCount = handleTableRowClick(1);
  console.log(`- 操作后可见行数: ${newVisibleCount}`);

  console.log('- 获取前3行数据:');
  const rangeData = convertor.getVisibleDataRange(0, 2);
  rangeData.forEach(item => {
    console.log(`  行${item.rowIndex}: ${item.data.name} (索引${item.dataIndex})`);
  });

  console.log('\n✅ 示例演示完成！');
}
