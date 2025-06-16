const expandTree = (tree: any) => {
  if (tree.children) {
    tree.children.forEach(child => {
      expandTree(child);
    });
  }
};

const collapseTree = (tree: any) => {
  if (tree.children) {
    tree.children.forEach(child => {
      collapseTree(child);
    });
  }
};

export const convertListIndexToTreeIndex = (listIndex: number) => {
  return listIndex;
};

export const convertTreeIndexToListIndex = (treeIndex: number) => {
  return treeIndex;
};

const getPersonInList = (listIndex: number) => {
  const i = listIndex + 1;
  return {
    id: i + 1,
    treeId: i + 1,
    email1: `${i + 1}@xxx.com`,
    name: `小明${i + 1}`,
    lastName: '王',
    date1: new Date().toISOString(),
    tel: '000-0000-0000',
    sex: i % 2 === 0 ? 'boy' : 'girl',
    work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
    city: 'beijing'
  };
};
