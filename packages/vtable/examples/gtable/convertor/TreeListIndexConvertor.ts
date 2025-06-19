import { safeArrayInsert } from '../../../src/tools/util';

/**
 * 索引树节点接口
 * 存储最基础的节点信息，不包含原始数据的其他属性
 */
interface IndexTreeNode {
  /** 节点的treeId */
  treeId: string;
  /** 在原始数据数组中的索引 */
  dataIndex: number;
  /** 父节点的treeId（避免循环引用） */
  parentTreeId: string | null;
  /** 子节点数组 */
  children: IndexTreeNode[];
  /** 是否折叠 */
  isCollapsed: boolean;
  /** 可见行索引缓存（仅在根节点中使用） */
  visibleIndexes?: number[] | null;
}

/**
 * 树形列表数据行号与索引转换工具（优化版）
 * 使用带层级的索引树来管理所有缓存功能
 */
class TreeListIndexConvertor {
  // ========== 原始数据 ==========
  /** 原始树形数据数组 */
  treeListData: any[];

  // ========== 索引树结构 ==========
  /** 索引树的虚拟根节点 */
  private readonly indexTreeRoot: IndexTreeNode;

  /** treeId到索引节点的快速映射 */
  private readonly treeIdToNodeMap: Map<string, IndexTreeNode>;

  // ========== 性能统计系统 ==========
  /** 方法调用统计 */
  private readonly performanceStatsMap: Map<string, any>;

  constructor(treeListData: any[]) {
    this.treeListData = treeListData;

    // 初始化索引树
    this.indexTreeRoot = {
      treeId: '',
      dataIndex: -1,
      parentTreeId: null,
      children: [],
      isCollapsed: false,
      visibleIndexes: null
    };
    this.treeIdToNodeMap = new Map();

    // 初始化性能统计
    this.performanceStatsMap = new Map();

    // 构建索引树
    this._buildIndexTree();
  }

  /**
   * 构建索引树结构
   * 这是核心方法，构建了整个树形索引结构
   */
  private _buildIndexTree() {
    const timeBegin = performance.now();

    // 清空现有结构
    this.indexTreeRoot.children = [];
    this.treeIdToNodeMap.clear();

    // 第一步：创建所有索引节点
    const allNodes: Map<string, IndexTreeNode> = new Map();

    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      const node: IndexTreeNode = {
        treeId: item.treeId,
        dataIndex: i,
        parentTreeId: null,
        children: [],
        isCollapsed: false
      };
      allNodes.set(item.treeId, node);
      this.treeIdToNodeMap.set(item.treeId, node);
    }

    // 第二步：建立父子关系
    for (const node of allNodes.values()) {
      const parts = node.treeId.split('.');
      if (parts.length === 1) {
        // 根级节点，挂载到虚拟根节点下
        node.parentTreeId = '';
        this.indexTreeRoot.children.push(node);
      } else {
        // 子节点，找到其父节点
        const parentTreeId = parts.slice(0, -1).join('.');
        const parentNode = allNodes.get(parentTreeId);
        if (parentNode) {
          node.parentTreeId = parentTreeId;
          parentNode.children.push(node);
        } else {
          // 如果找不到父节点，暂时挂载到根节点（数据可能有问题）
          console.warn(`找不到父节点: ${parentTreeId} for ${node.treeId}`);
          node.parentTreeId = '';
          this.indexTreeRoot.children.push(node);
        }
      }
    }

    // 第三步：对每个节点的子节点按dataIndex排序，确保顺序一致
    this._sortChildrenRecursively(this.indexTreeRoot);

    const timeEnd = performance.now();
    console.log(`_buildIndexTree time: ${timeEnd - timeBegin}ms`);
  }

  /**
   * 递归对子节点排序
   */
  private _sortChildrenRecursively(node: IndexTreeNode) {
    // 按dataIndex排序，保持与原始数据的顺序一致
    node.children.sort((a, b) => a.dataIndex - b.dataIndex);

    // 递归处理子节点
    for (const child of node.children) {
      this._sortChildrenRecursively(child);
    }
  }

  /**
   * 通用统计函数
   */
  private _withStatistics(methodName: string, fn: Function, enableStatistics = false) {
    if (!enableStatistics) {
      return fn();
    }

    const startTime = performance.now();

    let stats = this.performanceStatsMap.get(methodName);
    if (!stats || !stats.active) {
      stats = {
        callCount: 0,
        totalTime: 0,
        active: true,
        timer: null
      };
      this.performanceStatsMap.set(methodName, stats);
    }

    const result = fn();

    const endTime = performance.now();
    stats.callCount++;
    stats.totalTime += endTime - startTime;

    if (stats.timer) {
      clearTimeout(stats.timer);
    }

    stats.timer = setTimeout(() => {
      console.log(
        `${methodName} 统计结果: 调用次数=${stats.callCount}, 总耗时=${stats.totalTime.toFixed(2)}ms, 平均耗时=${(
          stats.totalTime / stats.callCount
        ).toFixed(2)}ms`
      );
      stats.active = false;
      stats.timer = null;
    }, 2000);

    return result;
  }

  /**
   * 清除可见行缓存
   */
  private _clearVisibleCache() {
    this.indexTreeRoot.visibleIndexes = null;
  }

  /**
   * 设置节点的折叠状态
   */
  setCollapsed(treeId: string, collapsed: boolean) {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node) {
      console.warn(`节点 ${treeId} 不存在`);
      return;
    }

    if (node.isCollapsed === collapsed) {
      return; // 状态没有变化
    }

    node.isCollapsed = collapsed;
    this._clearVisibleCache();
  }

  /**
   * 获取节点的折叠状态
   */
  isCollapsed(treeId: string): boolean {
    const node = this.treeIdToNodeMap.get(treeId);
    return node ? node.isCollapsed : false;
  }

  /**
   * 判断节点是否可见（考虑祖先节点的折叠状态）
   */
  isVisible(treeId: string): boolean {
    return this._withStatistics('isVisible', () => {
      const node = this.treeIdToNodeMap.get(treeId);
      if (!node) return false;

      // 检查所有祖先节点是否有折叠的
      let currentTreeId = node.parentTreeId;
      while (currentTreeId && currentTreeId !== '') {
        const current = this.treeIdToNodeMap.get(currentTreeId);
        if (!current) break;

        if (current.isCollapsed) {
          return false;
        }
        currentTreeId = current.parentTreeId;
      }

      return true;
    });
  }

  /**
   * 构建可见行的缓存映射
   */
  buildVisibleRowCache(): number[] {
    const timeBegin = performance.now();

    if (this.indexTreeRoot.visibleIndexes !== null && this.indexTreeRoot.visibleIndexes !== undefined) {
      return this.indexTreeRoot.visibleIndexes;
    }

    const visibleIndexes: number[] = [];
    this._collectVisibleNodes(this.indexTreeRoot, visibleIndexes);

    this.indexTreeRoot.visibleIndexes = visibleIndexes;

    const timeEnd = performance.now();
    console.log(`buildVisibleRowCache time: ${timeEnd - timeBegin}ms`);

    return visibleIndexes;
  }

  /**
   * 递归收集可见的节点索引
   */
  private _collectVisibleNodes(node: IndexTreeNode, result: number[]) {
    for (const child of node.children) {
      // 添加当前子节点
      result.push(child.dataIndex);

      // 如果子节点没有折叠，继续收集其子孙节点
      if (!child.isCollapsed) {
        this._collectVisibleNodes(child, result);
      }
    }
  }

  /**
   * 将table行号转换为数组索引
   */
  rowToIndex(rowIndex: number): number | null {
    const visibleIndexes = this.buildVisibleRowCache();
    if (rowIndex >= 0 && rowIndex < visibleIndexes.length) {
      return visibleIndexes[rowIndex];
    }
    return null;
  }

  /**
   * 将数组索引转换为table行号
   */
  indexToRow(dataIndex: number): number | null {
    if (dataIndex < 0 || dataIndex >= this.treeListData.length) {
      return null;
    }

    const item = this.treeListData[dataIndex];
    if (!this.isVisible(item.treeId)) {
      return null;
    }

    const visibleIndexes = this.buildVisibleRowCache();
    const result = visibleIndexes.indexOf(dataIndex);
    return result === -1 ? null : result;
  }

  /**
   * 获取当前可见行的总数
   */
  getVisibleRowCount(): number {
    return this.buildVisibleRowCache().length;
  }

  /**
   * 获取所有可见行的数据
   */
  getVisibleData(): any[] {
    const visibleIndexes = this.buildVisibleRowCache();
    return visibleIndexes.map((index: number) => this.treeListData[index]);
  }

  /**
   * 切换节点的折叠状态
   */
  toggleCollapsed(treeId: string): boolean {
    const isCurrentlyCollapsed = this.isCollapsed(treeId);
    this.setCollapsed(treeId, !isCurrentlyCollapsed);
    return !isCurrentlyCollapsed;
  }

  /**
   * 清除所有折叠状态（全部展开）
   */
  expandAll() {
    this._setCollapsedRecursively(this.indexTreeRoot, false);
    this._clearVisibleCache();
  }

  /**
   * 递归设置折叠状态
   */
  private _setCollapsedRecursively(node: IndexTreeNode, collapsed: boolean) {
    node.isCollapsed = collapsed;
    for (const child of node.children) {
      this._setCollapsedRecursively(child, collapsed);
    }
  }

  /**
   * 获取指定行范围的可见数据（用于虚拟滚动）
   */
  getVisibleDataRange(startRow: number, endRow: number) {
    const result: { rowIndex: number; dataIndex: number; data: any }[] = [];
    for (let row = startRow; row <= endRow; row++) {
      const dataIndex = this.rowToIndex(row);
      if (dataIndex !== null) {
        result.push({
          rowIndex: row,
          dataIndex: dataIndex,
          data: this.treeListData[dataIndex]
        });
      }
    }
    return result;
  }

  /**
   * 获取某个树节点下面所有的子孙节点
   */
  getDescendantNodes(treeId: string) {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node) return [];

    const descendants: { data: any; rowIndex: number | null }[] = [];
    this._collectDescendantNodes(node, descendants);

    return descendants;
  }

  /**
   * 递归收集子孙节点
   */
  private _collectDescendantNodes(node: IndexTreeNode, result: any[]) {
    for (const child of node.children) {
      result.push({
        data: this.treeListData[child.dataIndex],
        rowIndex: this.indexToRow(child.dataIndex)
      });

      // 递归收集子孙节点
      this._collectDescendantNodes(child, result);
    }
  }

  /**
   * 获取节点的直接子节点（一级子节点）
   */
  getDirectChildren(treeId: string) {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node) return [];

    return node.children.map((child: IndexTreeNode) => ({
      data: this.treeListData[child.dataIndex],
      rowIndex: this.indexToRow(child.dataIndex)
    }));
  }

  /**
   * 获取节点的父节点
   */
  getParentNode(treeId: string) {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node || !node.parentTreeId || node.parentTreeId === '') {
      return null;
    }

    const parentNode = this.treeIdToNodeMap.get(node.parentTreeId);
    if (!parentNode) {
      return null;
    }

    return {
      data: this.treeListData[parentNode.dataIndex],
      rowIndex: this.indexToRow(parentNode.dataIndex)
    };
  }

  /**
   * 批量获取多个节点的子孙节点
   */
  getBatchDescendantNodes(treeIds: string[]) {
    const result: Map<string, any[]> = new Map();

    for (const treeId of treeIds) {
      result.set(treeId, this.getDescendantNodes(treeId));
    }

    return result;
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      treeListData: this.treeListData,
      totalItems: this.treeListData.length,
      visibleItems: this.getVisibleRowCount(),
      collapsedNodes: this._getCollapsedNodes(),
      indexTreeStats: this._getIndexTreeStats()
    };
  }

  /**
   * 获取所有折叠的节点
   */
  private _getCollapsedNodes(): string[] {
    const collapsedNodes: string[] = [];
    this._collectCollapsedNodes(this.indexTreeRoot, collapsedNodes);
    return collapsedNodes;
  }

  /**
   * 递归收集折叠的节点
   */
  private _collectCollapsedNodes(node: IndexTreeNode, result: string[]) {
    if (node.isCollapsed && node !== this.indexTreeRoot) {
      result.push(node.treeId);
    }
    for (const child of node.children) {
      this._collectCollapsedNodes(child, result);
    }
  }

  /**
   * 获取索引树统计信息
   */
  private _getIndexTreeStats() {
    let totalNodes = 0;
    let maxDepth = 0;

    const traverse = (node: IndexTreeNode, depth: number) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    };

    traverse(this.indexTreeRoot, 0);

    return {
      totalNodes: totalNodes - 1, // 减去虚拟根节点
      maxDepth: maxDepth - 1, // 减去虚拟根节点层级
      rootChildrenCount: this.indexTreeRoot.children.length
    };
  }

  /**
   * 重新构建索引树
   */
  rebuildAllCaches() {
    this.indexTreeRoot.visibleIndexes = null;
    this._buildIndexTree();
  }

  /**
   * 更新插入位置后所有节点的dataIndex
   */
  private _updateDataIndexesAfterInsert(insertIndex: number) {
    for (const node of this.treeIdToNodeMap.values()) {
      if (node.dataIndex >= insertIndex) {
        node.dataIndex++;
      }
    }
  }

  /**
   * 更新批量插入位置后所有节点的dataIndex
   */
  private _updateDataIndexesAfterBatchInsert(insertIndex: number, insertCount: number) {
    for (const node of this.treeIdToNodeMap.values()) {
      if (node.dataIndex >= insertIndex) {
        node.dataIndex += insertCount;
      }
    }
  }

  /**
   * 建立新节点的父子关系
   */
  private _establishParentChildRelation(newNode: IndexTreeNode) {
    const parts = newNode.treeId.split('.');

    if (parts.length === 1) {
      // 根级节点，挂载到虚拟根节点下
      newNode.parentTreeId = '';
      this.indexTreeRoot.children.push(newNode);
      // 对根节点的子节点按dataIndex排序
      this.indexTreeRoot.children.sort((a, b) => a.dataIndex - b.dataIndex);
    } else {
      // 子节点，找到其父节点
      const parentTreeId = parts.slice(0, -1).join('.');
      const parentNode = this.treeIdToNodeMap.get(parentTreeId);

      if (parentNode) {
        newNode.parentTreeId = parentTreeId;
        parentNode.children.push(newNode);
        // 对父节点的子节点按dataIndex排序
        parentNode.children.sort((a, b) => a.dataIndex - b.dataIndex);
      } else {
        // 如果找不到父节点，暂时挂载到根节点
        console.warn(`找不到父节点: ${parentTreeId} for ${newNode.treeId}`);
        newNode.parentTreeId = '';
        this.indexTreeRoot.children.push(newNode);
        this.indexTreeRoot.children.sort((a, b) => a.dataIndex - b.dataIndex);
      }
    }
  }

  /**
   * 从父节点的children中移除节点
   */
  private _removeNodeFromParent(node: IndexTreeNode) {
    if (node.parentTreeId === '' || node.parentTreeId === null) {
      // 从根节点移除
      const index = this.indexTreeRoot.children.indexOf(node);
      if (index > -1) {
        this.indexTreeRoot.children.splice(index, 1);
      }
    } else {
      // 从父节点移除
      const parentNode = this.treeIdToNodeMap.get(node.parentTreeId);
      if (parentNode) {
        const index = parentNode.children.indexOf(node);
        if (index > -1) {
          parentNode.children.splice(index, 1);
        }
      }
    }
  }

  /**
   * 更新删除节点后所有节点的dataIndex
   */
  private _updateDataIndexesAfterRemove(removedNodes: IndexTreeNode[]) {
    // 按dataIndex降序排列的删除位置
    const removedIndexes = removedNodes.map(node => node.dataIndex).sort((a, b) => b - a);

    for (const node of this.treeIdToNodeMap.values()) {
      let adjustment = 0;
      for (const removedIndex of removedIndexes) {
        if (node.dataIndex > removedIndex) {
          adjustment++;
        }
      }
      node.dataIndex -= adjustment;
    }
  }

  // ========== 树形数据增删查改操作 ==========

  /**
   * 更新树形数据并重建索引树
   */
  updateTreeData(newTreeListData: any[]) {
    this.treeListData = newTreeListData;
    this.rebuildAllCaches();
  }

  /**
   * 添加新节点（增量更新）
   */
  addNode(nodeData: any, insertIndex?: number): boolean {
    if (!nodeData || !nodeData.treeId) {
      console.error('节点数据必须包含treeId');
      return false;
    }

    if (this.treeIdToNodeMap.has(nodeData.treeId)) {
      console.error(`节点 ${nodeData.treeId} 已存在`);
      return false;
    }

    const actualInsertIndex = insertIndex !== undefined ? insertIndex : this.treeListData.length;

    // 先插入数据
    this.treeListData.splice(actualInsertIndex, 0, nodeData);

    // 更新所有受影响节点的dataIndex
    this._updateDataIndexesAfterInsert(actualInsertIndex);

    // 创建新的索引节点
    const newNode: IndexTreeNode = {
      treeId: nodeData.treeId,
      dataIndex: actualInsertIndex,
      parentTreeId: null,
      children: [],
      isCollapsed: false
    };

    // 添加到映射表
    this.treeIdToNodeMap.set(nodeData.treeId, newNode);

    // 建立父子关系
    this._establishParentChildRelation(newNode);

    // 只清除可见行缓存
    this._clearVisibleCache();

    return true;
  }

  /**
   * 删除节点（包括其所有子孙节点）（增量更新）
   */
  removeNode(treeId: string): number[] {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node) {
      console.error(`节点 ${treeId} 不存在`);
      return [];
    }

    // 收集要删除的所有节点（包括子孙节点）
    const nodesToRemove: IndexTreeNode[] = [];
    const rowsToRemove: number[] = [];

    this._collectNodesToRemove(node, nodesToRemove);

    // 收集行号
    for (const nodeToRemove of nodesToRemove) {
      const rowIndex = this.indexToRow(nodeToRemove.dataIndex);
      if (rowIndex !== null) {
        rowsToRemove.push(rowIndex);
      }
    }

    // 按dataIndex降序排列，从后往前删除
    nodesToRemove.sort((a, b) => b.dataIndex - a.dataIndex);

    // 先从父节点的children中移除
    this._removeNodeFromParent(node);

    // 删除数据和索引映射
    for (const nodeToRemove of nodesToRemove) {
      this.treeListData.splice(nodeToRemove.dataIndex, 1);
      this.treeIdToNodeMap.delete(nodeToRemove.treeId);
    }

    // 更新所有受影响节点的dataIndex
    this._updateDataIndexesAfterRemove(nodesToRemove);

    // 只清除可见行缓存
    this._clearVisibleCache();

    return rowsToRemove;
  }

  /**
   * 收集要删除的节点（包括子孙节点）
   */
  private _collectNodesToRemove(node: IndexTreeNode, result: IndexTreeNode[]) {
    result.push(node);
    for (const child of node.children) {
      this._collectNodesToRemove(child, result);
    }
  }

  /**
   * 更新节点数据
   */
  updateNode(treeId: string, newData: any): boolean {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node) {
      console.error(`节点 ${treeId} 不存在`);
      return false;
    }

    newData.treeId = treeId;
    this.treeListData[node.dataIndex] = newData;

    this._clearVisibleCache();
    return true;
  }

  /**
   * 查找节点
   */
  findNode(treeId: string): any | null {
    const node = this.treeIdToNodeMap.get(treeId);
    if (!node) return null;
    return this.treeListData[node.dataIndex];
  }

  /**
   * 批量添加节点（增量更新）
   */
  addNodes(nodesData: any[], insertIndex?: number): boolean {
    if (!Array.isArray(nodesData) || nodesData.length === 0) {
      return false;
    }

    const timeBegin = performance.now();

    // 验证所有节点数据
    for (const nodeData of nodesData) {
      if (!nodeData || !nodeData.treeId) {
        console.error('所有节点数据必须包含treeId');
        return false;
      }
      if (this.treeIdToNodeMap.has(nodeData.treeId)) {
        console.error(`节点 ${nodeData.treeId} 已存在`);
        return false;
      }
    }

    const actualInsertIndex = insertIndex !== undefined ? insertIndex : this.treeListData.length;

    // 先插入数据
    this.treeListData.splice(actualInsertIndex, 0, ...nodesData);

    // 更新所有受影响节点的dataIndex
    this._updateDataIndexesAfterBatchInsert(actualInsertIndex, nodesData.length);

    // 批量创建索引节点并建立关系
    for (let i = 0; i < nodesData.length; i++) {
      const nodeData = nodesData[i];
      const newNode: IndexTreeNode = {
        treeId: nodeData.treeId,
        dataIndex: actualInsertIndex + i,
        parentTreeId: null,
        children: [],
        isCollapsed: false
      };

      this.treeIdToNodeMap.set(nodeData.treeId, newNode);
      this._establishParentChildRelation(newNode);
    }

    // 只清除可见行缓存
    this._clearVisibleCache();

    const timeEnd = performance.now();
    console.log(`addNodes (${nodesData.length} nodes) time: ${timeEnd - timeBegin}ms`);

    return true;
  }
}

export default TreeListIndexConvertor;
