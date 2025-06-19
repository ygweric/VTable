import * as VTable from '@visactor/vtable';
import { bindDebugTool } from '@visactor/vtable/es/scenegraph/debug-tool';
import { AddRowColumnPlugin } from '../../src';
const CONTAINER_ID = 'vTable';
function generateRandomString(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function generateRandomHobbies() {
  const hobbies = ['Reading books', 'Playing video games', 'Watching movies', 'Writing', 'Swimming'];

  const numHobbies = Math.floor(Math.random() * 3) + 1; // 生成 1-3 之间的随机整数
  const selectedHobbies = [];

  for (let i = 0; i < numHobbies; i++) {
    const randomIndex = Math.floor(Math.random() * hobbies.length);
    const hobby = hobbies[randomIndex];
    selectedHobbies.push(hobby);
    hobbies.splice(randomIndex, 1); // 确保每个爱好只选一次
  }

  return selectedHobbies.join(', ');
}
function generateRandomBirthday() {
  const start = new Date('1970-01-01');
  const end = new Date('2000-12-31');
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  const year = randomDate.getFullYear();
  const month = randomDate.getMonth() + 1;
  const day = randomDate.getDate();
  return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

function generateRandomPhoneNumber() {
  const areaCode = ['130', '183', '184', '185', '186', '187', '188', '189'];
  const prefix = areaCode[Math.floor(Math.random() * areaCode.length)];
  const suffix = String(Math.random()).substr(2, 8);
  return prefix + suffix;
}

function getRandomDepartment(level: number) {
  const deparments = [
    ['层级a1', '层级a2', '层级a3', '层级a4', '层级a5'],
    ['层级b1', '层级b2', '层级b3', '层级b4', '层级b5'],
    ['层级c1', '层级c2', '层级c3', '层级c4', '层级c5'],
    ['层级d1', '层级d2', '层级d3', '层级d4', '层级d5'],
    ['层级e1', '层级e2', '层级e3', '层级e4', '层级e5'],
    ['层级f1', '层级f2', '层级f3', '层级f4', '层级f5'],
    ['层级g1', '层级g2', '层级g3', '层级g4', '层级g5'],
    ['层级h1', '层级h2', '层级h3', '层级h4', '层级h5'],
    ['层级i1', '层级i2', '层级i3', '层级i4', '层级i5'],
    ['层级j1', '层级j2', '层级j3', '层级j4', '层级j5'],
    ['层级k1', '层级k2', '层级k3', '层级k4', '层级k5']
  ];

  return deparments[level][Math.floor(Math.random() * deparments[level].length)];
}

const generatePersons = (count: number) => {
  return Array.from(new Array(count)).map((_, i) => {
    const first = generateRandomString(10);
    const last = generateRandomString(4);
    let id = 0;
    return {
      department: getRandomDepartment(0),
      id: id++,
      email1: `${first}_${last}@xxx.com`,
      name: first,
      lastName: last,
      hobbies: generateRandomHobbies(),
      birthday: generateRandomBirthday(),
      tel: generateRandomPhoneNumber(),
      sex: i % 2 === 0 ? 'boy' : 'girl',
      work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
      city: 'beijing',
      children: Array.from(new Array(3)).map(() => ({
        group: getRandomDepartment(1),
        id: id++,
        email1: `${first}_${last}@xxx.com`,
        name: first,
        lastName: last,
        hobbies: generateRandomHobbies(),
        birthday: generateRandomBirthday(),
        tel: generateRandomPhoneNumber(),
        sex: i % 2 === 0 ? 'boy' : 'girl',
        work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
        city: 'beijing',
        children: Array.from(new Array(3)).map(() => ({
          group: getRandomDepartment(2),
          id: id++,
          email1: `${first}_${last}@xxx.com`,
          name: first,
          lastName: last,
          hobbies: generateRandomHobbies(),
          birthday: generateRandomBirthday(),
          tel: generateRandomPhoneNumber(),
          sex: i % 2 === 0 ? 'boy' : 'girl',
          work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
          city: 'beijing',
          children: Array.from(new Array(0)).map(() => ({
            group: getRandomDepartment(3),
            id: id++,
            email1: `${first}_${last}@xxx.com`,
            name: first,
            lastName: last,
            hobbies: generateRandomHobbies(),
            birthday: generateRandomBirthday(),
            tel: generateRandomPhoneNumber(),
            sex: i % 2 === 0 ? 'boy' : 'girl',
            work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
            city: 'beijing',
            children: Array.from(new Array(5)).map(() => ({
              group: getRandomDepartment(4),
              id: id++,
              email1: `${first}_${last}@xxx.com`,
              name: first,
              lastName: last,
              hobbies: generateRandomHobbies(),
              birthday: generateRandomBirthday(),
              tel: generateRandomPhoneNumber(),
              sex: i % 2 === 0 ? 'boy' : 'girl',
              work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
              city: 'beijing',
              children: Array.from(new Array(5)).map(() => ({
                group: getRandomDepartment(5),
                id: id++,
                email1: `${first}_${last}@xxx.com`,
                name: first,
                lastName: last,
                hobbies: generateRandomHobbies(),
                birthday: generateRandomBirthday(),
                tel: generateRandomPhoneNumber(),
                sex: i % 2 === 0 ? 'boy' : 'girl',
                work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
                city: 'beijing',
                children: Array.from(new Array(5)).map(() => ({
                  group: getRandomDepartment(6),
                  id: id++,
                  email1: `${first}_${last}@xxx.com`,
                  name: first,
                  lastName: last,
                  hobbies: generateRandomHobbies(),
                  birthday: generateRandomBirthday(),
                  tel: generateRandomPhoneNumber(),
                  sex: i % 2 === 0 ? 'boy' : 'girl',
                  work: i % 2 === 0 ? 'back-end engineer' : 'front-end engineer',
                  city: 'beijing'
                  // children: Array.from(new Array(5)).map(() => ({
                  //   group: getRandomDepartment(7),
                  //    id: id++,
                  //   email1: `${first}_${last}@xxx.com`,
                  //   name: first,
                  //   lastName: last,
                  //   hobbies: generateRandomHobbies(),
                  //   birthday: generateRandomBirthday(),
                  //   tel: generateRandomPhoneNumber(),
                  //   sex: i % 2 === 0 ? 'boy' : 'girl',
                  //   work:
                  //     i % 2 === 0
                  //       ? 'back-end engineer'
                  //       : 'front-end engineer',
                  //   city: 'beijing',
                  //   children: Array.from(new Array(5)).map(() => ({
                  //     group: getRandomDepartment(8),
                  //      id: id++,
                  //     email1: `${first}_${last}@xxx.com`,
                  //     name: first,
                  //     lastName: last,
                  //     hobbies: generateRandomHobbies(),
                  //     birthday: generateRandomBirthday(),
                  //     tel: generateRandomPhoneNumber(),
                  //     sex: i % 2 === 0 ? 'boy' : 'girl',
                  //     work:
                  //       i % 2 === 0
                  //         ? 'back-end engineer'
                  //         : 'front-end engineer',
                  //     city: 'beijing',
                  //     children: Array.from(new Array(2)).map(() => ({
                  //       group: getRandomDepartment(9),
                  //        id: id++,
                  //       email1: `${first}_${last}@xxx.com`,
                  //       name: first,
                  //       lastName: last,
                  //       hobbies: generateRandomHobbies(),
                  //       birthday: generateRandomBirthday(),
                  //       tel: generateRandomPhoneNumber(),
                  //       sex: i % 2 === 0 ? 'boy' : 'girl',
                  //       work:
                  //         i % 2 === 0
                  //           ? 'back-end engineer'
                  //           : 'front-end engineer',
                  //       city: 'beijing',
                  //     })),
                  //   })),
                  // })),
                }))
              }))
            }))
          }))
        }))
      }))
    };
  });
};

export function createTable() {
  const records = generatePersons(1);
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
  const addRowColumn = new AddRowColumnPlugin();
  const option: VTable.ListTableConstructorOptions = {
    container: document.getElementById(CONTAINER_ID),
    records,
    columns,
    padding: 30,
    plugins: [addRowColumn]
  };
  addRowColumn.pluginOptions.addRowEnable = true;
  const tableInstance = new VTable.ListTable(option);
  window.tableInstance = tableInstance;

  bindDebugTool(tableInstance.scenegraph.stage, {
    customGrapicKeys: ['col', 'row']
  });
}
