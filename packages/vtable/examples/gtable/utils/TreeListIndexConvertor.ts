/**
 * 树形列表数据行号与索引转换工具
 * 用于处理扁平树形数据在展开/折叠状态下的行号与数组索引对应关系
 */
class TreeListIndexConvertor {
  treeListData: any[];
  collapsedMap: Map<string, boolean>; // TODO 用Set会增加效率
  visibleRowCache: number[] | null;
  cacheVersion: number;

  constructor(treeListData: any[]) {
    this.treeListData = treeListData;
    // 存储每个节点的折叠状态，key: treeId, value: boolean (true=折叠, false=展开)
    this.collapsedMap = new Map();
    // 缓存可见行的索引映射，用于性能优化
    this.visibleRowCache = null;
    this.cacheVersion = 0;
  }

  /**
   * 设置节点的折叠状态
   * @param {string} treeId - 节点的treeId
   * @param {boolean} collapsed - 是否折叠
   */
  setCollapsed(treeId: string, collapsed: boolean) {
    if (collapsed) {
      this.collapsedMap.set(treeId, true);
    } else {
      this.collapsedMap.delete(treeId);
    }
    // 清除缓存
    this.visibleRowCache = null;
    this.cacheVersion++;
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
    const parts = treeId.split('.');
    // 检查所有父节点是否折叠
    for (let i = 1; i < parts.length; i++) {
      const parentTreeId = parts.slice(0, i).join('.');
      if (this.collapsedMap.has(parentTreeId)) {
        return false;
      }
    }
    return true;
  }

  getAllChildren(treeId: string) {
    const parts = treeId.split('.');
    // 检查所有父节点是否折叠
    for (let i = 1; i < parts.length; i++) {
      const parentTreeId = parts.slice(0, i).join('.');
      if (this.collapsedMap.has(parentTreeId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 构建可见行的缓存映射
   * @returns {Array} 可见行的索引数组
   */
  buildVisibleRowCache() {
    if (this.visibleRowCache !== null) {
      return this.visibleRowCache;
    }

    const visibleRows: number[] = [];
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];
      if (this.isVisible(item.treeId)) {
        visibleRows.push(i);
      }
    }

    this.visibleRowCache = visibleRows;
    return visibleRows;
  }

  /**
   * 将table行号转换为数组索引
   * @param {number} rowIndex - table行号（从0开始）
   * @returns {number|null} 对应的数组索引，如果不存在返回null
   */
  rowToIndex(rowIndex: number) {
    const visibleRows = this.buildVisibleRowCache();
    if (rowIndex >= 0 && rowIndex < visibleRows.length) {
      return visibleRows[rowIndex];
    }
    return null;
  }

  /**
   * 将数组索引转换为table行号
   * @param {number} dataIndex - 数组索引
   * @returns {number|null} 对应的table行号，如果节点不可见返回null
   */
  indexToRow(dataIndex: number) {
    if (dataIndex < 0 || dataIndex >= this.treeListData.length) {
      return null;
    }

    const item = this.treeListData[dataIndex];
    if (!this.isVisible(item.treeId)) {
      return null;
    }

    const visibleRows = this.buildVisibleRowCache();
    return visibleRows.indexOf(dataIndex);
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
    const visibleRows = this.buildVisibleRowCache();
    return visibleRows.map(index => this.treeListData[index]);
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
    this.visibleRowCache = null;
    this.cacheVersion++;
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
      cacheVersion: this.cacheVersion
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
   * 获取某个树节点下面所有的子孙节点
   * @param {string} treeId - 父节点的treeId
   * @returns {Array} 返回子孙节点数组，每个元素包含节点内容和在当前树形状态下的行号
   *                  格式: [{data: nodeData, rowIndex: number|null}, ...]
   */
  getDescendantNodes(treeId: string) {
    const descendants: { data: any; rowIndex: number | null }[] = [];

    // 遍历所有数据，找到以指定treeId为前缀的子孙节点
    for (let i = 0; i < this.treeListData.length; i++) {
      const item = this.treeListData[i];

      // 检查是否为子孙节点（treeId以父节点开头且更深层）
      if (item.treeId !== treeId && item.treeId.startsWith(treeId + '.')) {
        // 获取该节点在当前树形状态下的行号
        const rowIndex = this.indexToRow(i);

        descendants.push({
          data: item,
          rowIndex: rowIndex // 如果节点被折叠不可见，rowIndex为null
        });
      }
    }

    return descendants;
  }
}

// 便捷函数
const createConvertor = (data: any[]) => new TreeListIndexConvertor(data);

// 导出工具类和示例
export { TreeListIndexConvertor, createConvertor };

// 默认导出
export default TreeListIndexConvertor;
