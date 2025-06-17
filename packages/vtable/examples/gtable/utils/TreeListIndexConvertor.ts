/**
 * 树形列表数据行号与索引转换工具
 * 用于处理扁平树形数据在展开/折叠状态下的行号与数组索引对应关系
 */
class TreeListIndexConvertor {
  treeListData: any;
  collapsedMap: Map<any, any>;
  visibleRowCache: number[] | null;
  cacheVersion: number;
  descendantCache: Map<any, any>;
  parentChildCache: Map<any, any>;
  visibilityCache: Map<any, any>;
  treeIdIndexCache: Map<any, any>;
  // 统计系统
  statsMap: Map<string, any>;
  // 方法结果缓存
  rowToIndexCache: Map<number, number | null>;
  indexToRowCache: Map<number, number | null>;
  constructor(treeListData: any[]) {
    this.treeListData = treeListData;
    // 存储每个节点的折叠状态，key: treeId, value: boolean (true=折叠, false=展开)
    this.collapsedMap = new Map();

    // ========== 缓存系统 ==========
    // 可见行缓存
    this.visibleRowCache = null;
    this.cacheVersion = 0;

    // 子孙节点缓存：key: treeId, value: Array<{dataIndex, data}>
    this.descendantCache = new Map();

    // 父子关系缓存：key: parentTreeId, value: Array<{dataIndex, treeId}>
    this.parentChildCache = new Map();

    // 可见性缓存：key: treeId, value: boolean
    this.visibilityCache = new Map();

    // 节点索引映射缓存：key: treeId, value: dataIndex
    this.treeIdIndexCache = new Map();

    // ========== 统计系统 ==========
    this.statsMap = new Map();

    // ========== 方法结果缓存 ==========
    this.rowToIndexCache = new Map();
    this.indexToRowCache = new Map();

    // 初始化基础缓存
    this._buildBasicCaches();
  }

  /**
   * 通用统计函数
   * @param {string} methodName - 方法名称
   * @param {Function} fn - 要执行的函数
   * @returns 函数执行结果
   */
  _withStatistics(methodName: string, fn: Function) {
    return fn();
    // const startTime = performance.now();

    // // 获取或创建统计对象
    // let stats = this.statsMap.get(methodName);
    // if (!stats || !stats.active) {
    //   stats = {
    //     callCount: 0,
    //     totalTime: 0,
    //     active: true,
    //     timer: null
    //   };
    //   this.statsMap.set(methodName, stats);
    // }

    // // 执行函数
    // const result = fn();

    // // 更新统计
    // const endTime = performance.now();
    // stats.callCount++;
    // stats.totalTime += endTime - startTime;

    // // 清除之前的定时器
    // if (stats.timer) {
    //   clearTimeout(stats.timer);
    // }

    // // 设置新的定时器，2秒后输出统计结果
    // stats.timer = setTimeout(() => {
    //   console.log(
    //     `${methodName} 统计结果: 调用次数=${stats.callCount}, 总耗时=${stats.totalTime.toFixed(2)}ms, 平均耗时=${(
    //       stats.totalTime / stats.callCount
    //     ).toFixed(2)}ms`
    //   );
    //   stats.active = false;
    //   stats.timer = null;
    // }, 2000);

    // return result;
  }

  /**
   * 构建基础缓存（节点索引映射和父子关系）
   * 这些缓存在数据结构不变的情况下可以复用
   */
  _buildBasicCaches() {
    if (this.treeIdIndexCache.size > 0) return;

    this.treeIdIndexCache.clear();
    this.parentChildCache.clear();
    const timeBegin = performance.now();

    // 构建 treeId 到 dataIndex 的映射
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      this.treeIdIndexCache.set(item.treeId, i);

      // 构建父子关系缓存
      const parts = item.treeId.split('.');
      if (parts.length > 1) {
        const parentTreeId = parts.slice(0, -1).join('.');
        if (!this.parentChildCache.has(parentTreeId)) {
          this.parentChildCache.set(parentTreeId, []);
        }
        this.parentChildCache.get(parentTreeId).push({
          dataIndex: i,
          treeId: item.treeId
        });
      }
    }
    const timeEnd = performance.now();
    console.log(`_buildBasicCaches time: ${timeEnd - timeBegin}ms`);
  }

  /**
   * 清除所有依赖于折叠状态的缓存
   */
  _clearStateDependentCaches() {
    this.visibleRowCache = null;
    this.descendantCache.clear();
    this.visibilityCache.clear();
    this.cacheVersion++;
  }

  /**
   * 针对特定节点清除相关缓存
   * @param {string} treeId - 受影响的节点treeId
   */
  _clearCachesForNode(treeId: string) {
    // 不再直接清除 visibleRowCache，改为局部更新
    // this.visibleRowCache = null;

    // 清除该节点的子孙节点缓存 // 这里不需要clear
    // this.descendantCache.delete(treeId);

    // 清除受影响节点及其所有子孙节点的可见性缓存
    for (const [cachedTreeId] of this.visibilityCache) {
      if (cachedTreeId === treeId || cachedTreeId.startsWith(treeId + '.')) {
        this.visibilityCache.delete(cachedTreeId);
      }
    }

    // 清除方法结果缓存
    this.rowToIndexCache.clear();
    this.indexToRowCache.clear();

    this.cacheVersion++;
  }

  /**
   * 局部更新可见行缓存 - 折叠节点时移除相关行
   * @param {string} treeId - 被折叠的节点treeId
   */
  _updateVisibleRowCacheOnCollapse(treeId: string) {
    if (!this.visibleRowCache) {
      return; // 如果缓存不存在，不需要更新
    }

    // 获取要移除的节点索引集合
    const nodesToRemove = new Set<number>();

    // 添加所有子孙节点的索引
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      if (item.treeId.startsWith(treeId + '.')) {
        nodesToRemove.add(i);
      }
    }

    // 从visibleRowCache中移除这些索引
    this.visibleRowCache = this.visibleRowCache.filter(index => !nodesToRemove.has(index));
  }

  /**
   * 局部更新可见行缓存 - 展开节点时添加相关行
   * @param {string} treeId - 被展开的节点treeId
   */
  _updateVisibleRowCacheOnExpand(treeId: string) {
    if (!this.visibleRowCache) {
      return; // 如果缓存不存在，不需要更新
    }

    // 找到要插入的位置（父节点在visibleRowCache中的位置）
    const parentDataIndex = this.treeIdIndexCache.get(treeId);
    if (parentDataIndex === undefined) return;

    const parentPositionInVisible = this.visibleRowCache.indexOf(parentDataIndex);
    if (parentPositionInVisible === -1) return;

    // 获取直接子节点
    const directChildren = this.parentChildCache.get(treeId);
    if (!directChildren) return;

    // 找到所有应该可见的子孙节点
    const nodesToAdd: number[] = [];
    const addVisibleDescendants = (currentTreeId: string) => {
      const children = this.parentChildCache.get(currentTreeId);
      if (!children) return;

      for (const child of children) {
        nodesToAdd.push(child.dataIndex);

        // 如果子节点没有被折叠，继续添加其子孙节点
        if (!this.collapsedMap.has(child.treeId)) {
          addVisibleDescendants(child.treeId);
        }
      }
    };

    addVisibleDescendants(treeId);

    // 按照数据索引排序，确保插入顺序正确
    nodesToAdd.sort((a, b) => a - b);

    // 在正确位置插入新的可见节点
    this.visibleRowCache.splice(parentPositionInVisible + 1, 0, ...nodesToAdd);
  }

  /**
   * 设置节点的折叠状态
   * @param {string} treeId - 节点的treeId
   * @param {boolean} collapsed - 是否折叠
   */
  setCollapsed(treeId: string, collapsed: boolean) {
    const wasCollapsed = this.collapsedMap.has(treeId);

    // 先清除受影响节点的相关缓存（除了visibleRowCache）
    this._clearCachesForNode(treeId);

    if (collapsed) {
      this.collapsedMap.set(treeId, true);
      // 如果之前是展开状态，现在折叠，需要移除子孙节点
      if (!wasCollapsed) {
        this._updateVisibleRowCacheOnCollapse(treeId);
      }
    } else {
      this.collapsedMap.delete(treeId);
      // 如果之前是折叠状态，现在展开，需要添加子孙节点
      if (wasCollapsed) {
        this._updateVisibleRowCacheOnExpand(treeId);
      }
    }
  }

  /**
   * 获取节点的折叠状态
   * @param {string} treeId - 节点的treeId
   * @returns {boolean} 是否折叠
   */
  isCollapsed(treeId: string) {
    return this.collapsedMap.has(treeId);
  }

  /**
   * 判断节点是否可见（考虑父节点的折叠状态）
   * @param {string} treeId - 节点的treeId
   * @returns {boolean} 是否可见
   */
  isVisible(treeId: string) {
    return this._withStatistics('isVisible', () => {
      // 检查缓存
      if (this.visibilityCache.has(treeId)) {
        return this.visibilityCache.get(treeId);
      }

      const parts = treeId.split('.');
      // 检查所有父节点是否折叠
      for (let i = 1; i < parts.length; i++) {
        const parentTreeId = parts.slice(0, i).join('.');
        if (this.collapsedMap.has(parentTreeId)) {
          this.visibilityCache.set(treeId, false);
          return false;
        }
      }

      this.visibilityCache.set(treeId, true);
      return true;
    });
  }

  /**
   * 构建可见行的缓存映射
   * @returns {Array} 可见行的索引数组
   */
  buildVisibleRowCache() {
    const timeBegin = performance.now();
    if (this.visibleRowCache !== null) {
      return this.visibleRowCache;
    }

    const visibleIndexes: number[] = [];
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      if (this.isVisible(item.treeId)) {
        visibleIndexes.push(i);
      }
    }
    const timeEnd = performance.now();
    console.log(`buildVisibleRowCache time: ${timeEnd - timeBegin}ms`);
    this.visibleRowCache = visibleIndexes;
    return visibleIndexes;
  }

  /**
   * 将table行号转换为数组索引
   * @param {number} rowIndex - table行号（从0开始）
   * @returns {number|null} 对应的数组索引，如果不存在返回null
   */
  rowToIndex(rowIndex: number) {
    return this._withStatistics('rowToIndex', () => {
      // 检查缓存
      if (this.rowToIndexCache.has(rowIndex)) {
        return this.rowToIndexCache.get(rowIndex)!;
      }

      const visibleIndexes = this.buildVisibleRowCache();
      let result: number | null = null;
      if (rowIndex >= 0 && rowIndex < visibleIndexes.length) {
        result = visibleIndexes[rowIndex];
      }

      // 缓存结果
      this.rowToIndexCache.set(rowIndex, result);
      return result;
    });
  }

  /**
   * 将数组索引转换为table行号
   * @param {number} dataIndex - 数组索引
   * @returns {number|null} 对应的table行号，如果节点不可见返回null
   */
  indexToRow(dataIndex: number) {
    return this._withStatistics('indexToRow', () => {
      // 检查缓存
      if (this.indexToRowCache.has(dataIndex)) {
        return this.indexToRowCache.get(dataIndex)!;
      }

      if (dataIndex < 0 || dataIndex >= this.treeListData.length) {
        this.indexToRowCache.set(dataIndex, null);
        return null;
      }

      const item = this.treeListData[dataIndex];
      if (!this.isVisible(item.treeId)) {
        this.indexToRowCache.set(dataIndex, null);
        return null;
      }

      const visibleIndexes = this.buildVisibleRowCache();
      const result = visibleIndexes.indexOf(dataIndex);
      const finalResult = result === -1 ? null : result;

      // 缓存结果
      this.indexToRowCache.set(dataIndex, finalResult);
      return finalResult;
    });
  }

  /**
   * 获取当前可见行的总数
   * @returns {number} 可见行数
   */
  getVisibleRowCount() {
    return this.buildVisibleRowCache().length;
  }

  /**
   * 获取所有可见行的数据
   * @returns {Array} 可见行的数据数组
   */
  getVisibleData() {
    const visibleIndexes = this.buildVisibleRowCache();
    return visibleIndexes.map((index: number) => this.treeListData[index]);
  }

  /**
   * 切换节点的折叠状态
   * @param {string} treeId - 节点的treeId
   * @returns {boolean} 切换后的状态（true=折叠, false=展开）
   */
  toggleCollapsed(treeId: string) {
    const isCurrentlyCollapsed = this.isCollapsed(treeId);
    this.setCollapsed(treeId, !isCurrentlyCollapsed);
    return !isCurrentlyCollapsed;
  }

  /**
   * 清除所有折叠状态（全部展开）
   */
  expandAll() {
    this.collapsedMap.clear();

    // 如果有可见行缓存，可以更高效地重建
    if (this.visibleRowCache) {
      // 重建完整的可见行缓存（所有节点都可见）
      this.visibleRowCache = [];
      for (let i = 0; i < this.treeListData.length; i++) {
        this.visibleRowCache.push(i);
      }
    }

    this._clearStateDependentCaches();
  }

  /**
   * 获取调试信息
   * @returns {object} 包含当前状态的调试信息
   */
  getDebugInfo() {
    return {
      totalItems: this.treeListData.length,
      visibleItems: this.getVisibleRowCount(),
      collapsedNodes: Array.from(this.collapsedMap.keys()),
      cacheVersion: this.cacheVersion,
      cacheStats: {
        descendantCache: this.descendantCache.size,
        parentChildCache: this.parentChildCache.size,
        visibilityCache: this.visibilityCache.size,
        treeIdIndexCache: this.treeIdIndexCache.size,
        visibleRowCacheExists: this.visibleRowCache !== null
      }
    };
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
   * 获取某个树节点下面所有的子孙节点（优化版本，使用缓存）
   * @param {string} treeId - 父节点的treeId
   * @returns {Array} 返回子孙节点数组，每个元素包含节点内容和在当前树形状态下的行号
   *                  格式: [{data: nodeData, rowIndex: number|null}, ...]
   */
  getDescendantNodes(treeId: string) {
    // 检查缓存
    if (this.descendantCache.has(treeId)) {
      const cachedDescendants = this.descendantCache.get(treeId);
      // 返回带有当前行号的结果
      return cachedDescendants.map((item: any) => ({
        data: item.data,
        rowIndex: this.indexToRow(item.dataIndex)
      }));
    }

    const descendants: { data: any; rowIndex: number | null }[] = [];

    // 使用优化的查找策略
    this._findDescendantsRecursive(treeId, descendants);

    // 缓存结果（不包含rowIndex，因为rowIndex会随折叠状态变化）
    const cacheData = descendants.map(item => ({
      dataIndex: this.treeIdIndexCache.get(item.data.treeId),
      data: item.data
    }));
    this.descendantCache.set(treeId, cacheData);

    return descendants;
  }

  /**
   * 递归查找子孙节点（使用父子关系缓存优化）
   * @param {string} parentTreeId - 父节点ID
   * @param {Array} result - 结果数组
   */
  _findDescendantsRecursive(parentTreeId: string, result: any[]) {
    this._withStatistics('_findDescendantsRecursive', () => {
      const children = this.parentChildCache.get(parentTreeId);
      if (!children) return;

      for (const child of children) {
        const childData = this.treeListData[child.dataIndex];
        const rowIndex = this.indexToRow(child.dataIndex);

        result.push({
          data: childData,
          rowIndex: rowIndex
        });

        // 递归查找子孙节点
        this._findDescendantsRecursive(child.treeId, result);
      }
    });
  }

  /**
   * 批量获取多个节点的子孙节点（优化版本）
   * @param {Array<string>} treeIds - 多个父节点的treeId数组
   * @returns {Map} key: treeId, value: 子孙节点数组
   */
  getBatchDescendantNodes(treeIds: string[]) {
    const result: Map<string, any[]> = new Map();

    for (const treeId of treeIds) {
      result.set(treeId, this.getDescendantNodes(treeId));
    }

    return result;
  }

  /**
   * 获取节点的直接子节点（一级子节点）
   * @param {string} treeId - 父节点的treeId
   * @returns {Array} 直接子节点数组
   */
  getDirectChildren(treeId: string) {
    const children = this.parentChildCache.get(treeId);
    if (!children) return [];

    return children.map((child: any) => ({
      data: this.treeListData[child.dataIndex],
      rowIndex: this.indexToRow(child.dataIndex)
    }));
  }

  /**
   * 清除所有缓存并重新构建基础缓存
   */
  rebuildAllCaches() {
    // 清除所有缓存
    this.visibleRowCache = null;
    this.descendantCache.clear();
    this.parentChildCache.clear();
    this.visibilityCache.clear();
    this.treeIdIndexCache.clear();
    this.cacheVersion++;

    // 重新构建基础缓存
    this._buildBasicCaches();
  }

  /**
   * 验证visibleRowCache的一致性（仅用于测试和调试）
   * @returns {boolean} 缓存是否一致
   */
  validateVisibleRowCache() {
    if (!this.visibleRowCache) {
      return true; // 如果没有缓存，认为是一致的
    }

    // 重新计算预期的可见行
    const expectedVisible: number[] = [];
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      if (this.isVisible(item.treeId)) {
        expectedVisible.push(i);
      }
    }

    // 比较当前缓存与预期结果
    if (this.visibleRowCache.length !== expectedVisible.length) {
      console.error('visibleRowCache长度不匹配:', {
        cached: this.visibleRowCache.length,
        expected: expectedVisible.length
      });
      return false;
    }

    for (let i = 0; i < this.visibleRowCache.length; i++) {
      if (this.visibleRowCache[i] !== expectedVisible[i]) {
        console.error('visibleRowCache内容不匹配:', {
          index: i,
          cached: this.visibleRowCache[i],
          expected: expectedVisible[i]
        });
        return false;
      }
    }

    return true;
  }
}

// 便捷函数
const createConvertor = (data: any) => new TreeListIndexConvertor(data);

// 导出工具类和示例
export { TreeListIndexConvertor, createConvertor };

// 默认导出
export default TreeListIndexConvertor;
