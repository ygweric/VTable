import { safeArrayInsert } from '../../../src/tools/util';

/**
 * 树形列表数据行号与索引转换工具
 * 用于处理扁平树形数据在展开/折叠状态下的行号与数组索引对应关系
 */
class TreeListIndexConvertor {
  // ========== 原始数据 ==========
  /** 原始树形数据数组 */
  treeListData: any;

  // ========== 折叠状态管理 ==========
  /** 节点折叠状态映射表: key=treeId, value=true(已折叠) */
  private readonly nodeCollapseStateMap: Map<string, boolean>;

  // ========== 基础结构缓存（数据结构不变时可复用）==========
  /** 节点ID到数据索引的映射: key=treeId, value=dataIndex */
  private readonly treeIdToDataIndexMap: Map<string, number>;

  /** 父子关系缓存: key=parentTreeId, value=Array<{dataIndex, treeId}> */
  private readonly parentToChildrenMap: Map<string, Array<{ dataIndex: number; treeId: string }>>;

  // ========== 可见性相关缓存 ==========
  /** 可见行索引缓存: 所有当前可见行的数据索引数组 */
  private visibleDataIndexesCache: number[] | null;

  /** 节点可见性状态缓存: key=treeId, value=isVisible */
  private readonly nodeVisibilityCache: Map<string, boolean>;

  // ========== 子孙节点缓存 ==========
  /** 子孙节点缓存: key=treeId, value=Array<{dataIndex, data}> */
  private readonly descendantNodesCache: Map<string, Array<{ dataIndex: number; data: any }>>;

  // ========== 转换结果缓存 ==========
  /** 行号到数据索引转换缓存: key=rowIndex, value=dataIndex|null */
  private readonly rowToDataIndexCache: Map<number, number | null>;

  /** 数据索引到行号转换缓存: key=dataIndex, value=rowIndex|null */
  private readonly dataIndexToRowCache: Map<number, number | null>;

  // ========== 缓存版本控制 ==========
  /** 缓存版本号，用于跟踪缓存状态变化 */
  private cacheVersion: number;

  // ========== 性能统计系统 ==========
  /** 方法调用统计: key=methodName, value=统计信息 */
  private readonly performanceStatsMap: Map<string, any>;

  constructor(treeListData: any[]) {
    this.treeListData = treeListData;

    // 初始化折叠状态管理
    this.nodeCollapseStateMap = new Map();

    // 初始化基础结构缓存
    this.treeIdToDataIndexMap = new Map();
    this.parentToChildrenMap = new Map();

    // 初始化可见性相关缓存
    this.visibleDataIndexesCache = null;
    this.nodeVisibilityCache = new Map();

    // 初始化子孙节点缓存
    this.descendantNodesCache = new Map();

    // 初始化转换结果缓存
    this.rowToDataIndexCache = new Map();
    this.dataIndexToRowCache = new Map();

    // 初始化缓存版本控制
    this.cacheVersion = 0;

    // 初始化性能统计系统
    this.performanceStatsMap = new Map();

    // 构建基础缓存
    this._buildBasicCaches();
  }

  /**
   * 通用统计函数
   * @param {string} methodName - 方法名称
   * @param {Function} fn - 要执行的函数
   * @param {boolean} enableStatistics - 是否启用统计
   * @returns 函数执行结果
   */
  _withStatistics(methodName: string, fn: Function, enableStatistics = false) {
    if (!enableStatistics) {
      return fn();
    }

    const startTime = performance.now();

    // 获取或创建统计对象
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

    // 执行函数
    const result = fn();

    // 更新统计
    const endTime = performance.now();
    stats.callCount++;
    stats.totalTime += endTime - startTime;

    // 清除之前的定时器
    if (stats.timer) {
      clearTimeout(stats.timer);
    }

    // 设置新的定时器，2秒后输出统计结果
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
   * 安全的数组插入方法，避免大数组导致的调用栈溢出
   * @param {Array} targetArray - 目标数组
   * @param {number} insertIndex - 插入位置
   * @param {Array} itemsToInsert - 要插入的元素数组
   * @param {number} batchSize - 批处理大小，默认10000
   * @returns {Array} 修改后的数组
   */
  _safeArrayInsert222(targetArray: any[], insertIndex: number, itemsToInsert: any[], batchSize = 10000): any[] {
    if (itemsToInsert.length === 0) {
      return targetArray;
    }

    // 如果要插入的元素数量较小，直接使用splice
    if (itemsToInsert.length <= batchSize) {
      targetArray.splice(insertIndex, 0, ...itemsToInsert);
      return targetArray;
    }

    // 对于大数组，使用数组切片和合并的方式
    const beforePart = targetArray.slice(0, insertIndex);
    const afterPart = targetArray.slice(insertIndex);
    return beforePart.concat(itemsToInsert, afterPart);
  }

  /**
   * 构建基础缓存（节点索引映射和父子关系）
   * 这些缓存在数据结构不变的情况下可以复用
   */
  _buildBasicCaches() {
    if (this.treeIdToDataIndexMap.size > 0) return;

    this.treeIdToDataIndexMap.clear();
    this.parentToChildrenMap.clear();
    const timeBegin = performance.now();

    // 构建 treeId 到 dataIndex 的映射
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      this.treeIdToDataIndexMap.set(item.treeId, i);

      // 构建父子关系缓存
      const parts = item.treeId.split('.');
      if (parts.length > 1) {
        const parentTreeId = parts.slice(0, -1).join('.');
        if (!this.parentToChildrenMap.has(parentTreeId)) {
          this.parentToChildrenMap.set(parentTreeId, []);
        }
        this.parentToChildrenMap.get(parentTreeId)!.push({
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
    this.visibleDataIndexesCache = null;
    this.descendantNodesCache.clear();
    this.nodeVisibilityCache.clear();
    this.cacheVersion++;
  }

  /**
   * 针对特定节点清除相关缓存
   * @param {string} treeId - 受影响的节点treeId
   */
  _clearCachesForNode(treeId: string) {
    // 不再直接清除 visibleDataIndexesCache，改为局部更新
    // this.visibleDataIndexesCache = null;

    // 清除该节点的子孙节点缓存 // 这里不需要clear
    // this.descendantNodesCache.delete(treeId);

    // 清除受影响节点及其所有子孙节点的可见性缓存
    for (const [cachedTreeId] of this.nodeVisibilityCache) {
      if (cachedTreeId === treeId || cachedTreeId.startsWith(treeId + '.')) {
        this.nodeVisibilityCache.delete(cachedTreeId);
      }
    }

    // 清除方法结果缓存
    this.rowToDataIndexCache.clear();
    this.dataIndexToRowCache.clear();

    this.cacheVersion++;
  }

  /**
   * 局部更新可见行缓存 - 折叠节点时移除相关行
   * @param {string} treeId - 被折叠的节点treeId
   */
  _updateVisibleRowCacheOnCollapse(treeId: string) {
    if (!this.visibleDataIndexesCache) {
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

    // 从visibleDataIndexesCache中移除这些索引
    this.visibleDataIndexesCache = this.visibleDataIndexesCache.filter(index => !nodesToRemove.has(index));
  }

  /**
   * 局部更新可见行缓存 - 展开节点时添加相关行
   * @param {string} treeId - 被展开的节点treeId
   */
  _updateVisibleRowCacheOnExpand(treeId: string) {
    if (!this.visibleDataIndexesCache) {
      return; // 如果缓存不存在，不需要更新
    }

    // 找到要插入的位置（父节点在visibleDataIndexesCache中的位置）
    const parentDataIndex = this.treeIdToDataIndexMap.get(treeId);
    if (parentDataIndex === undefined) return;

    const parentPositionInVisible = this.visibleDataIndexesCache.indexOf(parentDataIndex);
    if (parentPositionInVisible === -1) return;

    // 获取直接子节点
    const directChildren = this.parentToChildrenMap.get(treeId);
    if (!directChildren) return;

    // 找到所有应该可见的子孙节点
    const nodesToAdd: number[] = [];
    const addVisibleDescendants = (currentTreeId: string) => {
      const children = this.parentToChildrenMap.get(currentTreeId);
      if (!children) return;

      for (const child of children) {
        nodesToAdd.push(child.dataIndex);

        // 如果子节点没有被折叠，继续添加其子孙节点
        if (!this.nodeCollapseStateMap.has(child.treeId)) {
          addVisibleDescendants(child.treeId);
        }
      }
    };

    addVisibleDescendants(treeId);

    // 按照数据索引排序，确保插入顺序正确
    nodesToAdd.sort((a, b) => a - b);

    // 优化：使用安全的数组插入方法，避免调用栈溢出
    if (nodesToAdd.length === 0) return;

    const insertPosition = parentPositionInVisible + 1;
    this.visibleDataIndexesCache = safeArrayInsert(this.visibleDataIndexesCache, insertPosition, nodesToAdd);
  }

  /**
   * 设置节点的折叠状态
   * @param {string} treeId - 节点的treeId
   * @param {boolean} collapsed - 是否折叠
   */
  setCollapsed(treeId: string, collapsed: boolean) {
    const wasCollapsed = this.nodeCollapseStateMap.has(treeId);

    // 先清除受影响节点的相关缓存（除了visibleDataIndexesCache）
    this._clearCachesForNode(treeId);

    if (collapsed) {
      this.nodeCollapseStateMap.set(treeId, true);
      // 如果之前是展开状态，现在折叠，需要移除子孙节点
      if (!wasCollapsed) {
        this._updateVisibleRowCacheOnCollapse(treeId);
      }
    } else {
      this.nodeCollapseStateMap.delete(treeId);
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
    return this.nodeCollapseStateMap.has(treeId);
  }

  /**
   * 判断节点是否可见（考虑父节点的折叠状态）
   * @param {string} treeId - 节点的treeId
   * @returns {boolean} 是否可见
   */
  isVisible(treeId: string) {
    return this._withStatistics('isVisible', () => {
      // 检查缓存
      if (this.nodeVisibilityCache.has(treeId)) {
        return this.nodeVisibilityCache.get(treeId);
      }

      const parts = treeId.split('.');
      // 检查所有父节点是否折叠
      for (let i = 1; i < parts.length; i++) {
        const parentTreeId = parts.slice(0, i).join('.');
        if (this.nodeCollapseStateMap.has(parentTreeId)) {
          this.nodeVisibilityCache.set(treeId, false);
          return false;
        }
      }

      this.nodeVisibilityCache.set(treeId, true);
      return true;
    });
  }

  /**
   * 构建可见行的缓存映射
   * @returns {Array} 可见行的索引数组
   */
  buildVisibleRowCache() {
    const timeBegin = performance.now();
    if (this.visibleDataIndexesCache !== null) {
      return this.visibleDataIndexesCache;
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
    this.visibleDataIndexesCache = visibleIndexes;
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
      if (this.rowToDataIndexCache.has(rowIndex)) {
        return this.rowToDataIndexCache.get(rowIndex)!;
      }

      const visibleIndexes = this.buildVisibleRowCache();
      let result: number | null = null;
      if (rowIndex >= 0 && rowIndex < visibleIndexes.length) {
        result = visibleIndexes[rowIndex];
      }

      // 缓存结果
      this.rowToDataIndexCache.set(rowIndex, result);
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
      if (this.dataIndexToRowCache.has(dataIndex)) {
        return this.dataIndexToRowCache.get(dataIndex)!;
      }

      if (dataIndex < 0 || dataIndex >= this.treeListData.length) {
        this.dataIndexToRowCache.set(dataIndex, null);
        return null;
      }

      const item = this.treeListData[dataIndex];
      if (!this.isVisible(item.treeId)) {
        this.dataIndexToRowCache.set(dataIndex, null);
        return null;
      }

      const visibleIndexes = this.buildVisibleRowCache();
      const result = visibleIndexes.indexOf(dataIndex);
      const finalResult = result === -1 ? null : result;

      // 缓存结果
      this.dataIndexToRowCache.set(dataIndex, finalResult);
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
    this.nodeCollapseStateMap.clear();

    // 如果有可见行缓存，可以更高效地重建
    if (this.visibleDataIndexesCache) {
      // 重建完整的可见行缓存（所有节点都可见）
      this.visibleDataIndexesCache = [];
      for (let i = 0; i < this.treeListData.length; i++) {
        this.visibleDataIndexesCache.push(i);
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
      collapsedNodes: Array.from(this.nodeCollapseStateMap.keys()),
      cacheVersion: this.cacheVersion,
      cacheStats: {
        descendantNodesCache: this.descendantNodesCache.size,
        parentToChildrenMap: this.parentToChildrenMap.size,
        nodeVisibilityCache: this.nodeVisibilityCache.size,
        visibleDataIndexesCacheExists: this.visibleDataIndexesCache !== null
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
    if (this.descendantNodesCache.has(treeId)) {
      const cachedDescendants = this.descendantNodesCache.get(treeId);
      if (cachedDescendants) {
        // 返回带有当前行号的结果
        return cachedDescendants.map((item: any) => ({
          data: item.data,
          rowIndex: this.indexToRow(item.dataIndex)
        }));
      }
    }

    const descendants: { data: any; rowIndex: number | null }[] = [];

    // 使用优化的查找策略
    this._withStatistics('_findDescendantsRecursive', () => {
      this._findDescendantsRecursive(treeId, descendants);
    });

    // 缓存结果（不包含rowIndex，因为rowIndex会随折叠状态变化）
    const cacheData = descendants
      .map(item => {
        const dataIndex = this.treeIdToDataIndexMap.get(item.data.treeId);
        if (dataIndex !== undefined) {
          return {
            dataIndex,
            data: item.data
          };
        }
        return null;
      })
      .filter((item): item is { dataIndex: number; data: any } => item !== null);

    this.descendantNodesCache.set(treeId, cacheData);

    return descendants;
  }

  /**
   * 递归查找子孙节点（使用父子关系缓存优化）
   * @param {string} parentTreeId - 父节点ID
   * @param {Array} result - 结果数组
   */
  _findDescendantsRecursive(parentTreeId: string, result: any[]) {
    const children = this.parentToChildrenMap.get(parentTreeId);
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
    const children = this.parentToChildrenMap.get(treeId);
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
    this.visibleDataIndexesCache = null;
    this.descendantNodesCache.clear();
    this.parentToChildrenMap.clear();
    this.nodeVisibilityCache.clear();
    this.treeIdToDataIndexMap.clear();
    this.cacheVersion++;

    // 重新构建基础缓存
    this._buildBasicCaches();
  }

  /**
   * 验证visibleDataIndexesCache的一致性（仅用于测试和调试）
   * @returns {boolean} 缓存是否一致
   */
  validateVisibleRowCache() {
    if (!this.visibleDataIndexesCache) {
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
    if (this.visibleDataIndexesCache.length !== expectedVisible.length) {
      console.error('visibleDataIndexesCache长度不匹配:', {
        cached: this.visibleDataIndexesCache.length,
        expected: expectedVisible.length
      });
      return false;
    }

    for (let i = 0; i < this.visibleDataIndexesCache.length; i++) {
      if (this.visibleDataIndexesCache[i] !== expectedVisible[i]) {
        console.error('visibleDataIndexesCache内容不匹配:', {
          index: i,
          cached: this.visibleDataIndexesCache[i],
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
