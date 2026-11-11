import type { Work } from '@zhiqing/content';
// Explicitly allowed test fixtures; never import a database record here.
export const works: Work[] = [
  {
    id: 'fixture-work-001',
    schemaVersion: 1,
    revision: 'fixture-r1',
    kind: 'fixture',
    slug: 'inspiration-collector',
    number: '01',
    title: '灵感收集器',
    summary: '给零散的灵感一个落脚点，让想法有机会继续生长。',
    type: '产品工具',
    stage: '进行中',
    art: 'ideas',
    image: '/assets/02-connecting-ideas.png',
    imageAlt: '之青亲手把灰蓝便笺放进连接板，整理零散灵感',
    sections: [
      { id: 'overview', title: '这是什么', paragraphs: ['一个关于记录与整理灵感的小工具设想。它想回答的问题是：怎样让零散的想法被留下来，也更容易被重新发现？'] },
      { id: 'motivation', title: '为什么做', paragraphs: ['灵感有时是一句话，有时是一张图，也可能是一个还没想清楚的问题。比起一开始就建立复杂分类，先降低记录的门槛。'] },
      { id: 'process', title: '过程与取舍', paragraphs: ['先收小第一轮的范围，验证最基本的记录路径，再根据实际反馈决定下一步。', '将设计意图、尝试过程和真实结果分开记录，不把设想当成已经完成的能力。'] },
      { id: 'next', title: '结果与下一步', paragraphs: ['这是用于检查作品叙事与阅读体验的示例。真实成果、使用反馈、截图和体验地址待补充。'] },
    ],
  },
  {
    id: 'fixture-work-002',
    schemaVersion: 1,
    revision: 'fixture-r1',
    kind: 'fixture',
    slug: 'interaction-lab',
    number: '02',
    title: '交互实验室',
    summary: '从一次点击、一段反馈开始，探索更自然的日常体验。',
    type: '设计实验',
    stage: '探索中',
    art: 'steps',
    image: '/assets/03-testing-feedback.png',
    imageAlt: '之青亲手按下灰蓝按钮，测试下沉和亮起的反馈',
    sections: [
      { id: 'overview', title: '这是什么', paragraphs: ['一组关于界面反馈的设计实验。从具体动作出发，观察不同反馈方式怎样影响使用时的感受。'] },
      { id: 'motivation', title: '为什么做', paragraphs: ['清楚的状态提示可以减少猜测。这个示例从按钮按下、等待、成功和失败几个时刻开始。'] },
      { id: 'process', title: '过程与取舍', paragraphs: ['先把一个最重要的操作做顺，再观察不同反馈方式。', '记录尚未回答的问题，不把概念练习写成已经完成的真实项目。'] },
      { id: 'next', title: '结果与下一步', paragraphs: ['这是用于检查作品叙事与阅读体验的示例。真实成果、使用反馈、截图和体验地址待补充。'] },
    ],
  },
];

