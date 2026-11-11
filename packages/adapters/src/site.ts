import type { Note, SiteData } from '@zhiqing/content';
export const notes: Note[] = [
  { id: 'fixture-note-001', schemaVersion: 1, revision: 'fixture-r2', kind: 'fixture', maturity: '示例', topics: [], relatedWorkIds: [], slug: 'from-ideas', title: '从想法到作品：给好奇心留一点空间', summary: '先把想法留下来，再寻找值得继续的线索。', type: '创作札记', date: '2026.10.26', update: '整理了从记录到尝试的思路。', sections: [
    { id: 'collect', title: '先留下线索', text: '一个想法出现的时候，往往还没有完整的形状。先记下吸引自己的细节，也记下当时的问题，不必急着给它一个结论。' },
    { id: 'start-small', title: '从小处开始', text: '把范围收小，先做出一个可以感受、可以讨论的版本。不是每个想法都需要变成完整产品，但每次尝试都可以留下收获。' },
    { id: 'patience', title: '给过程一点耐心', text: '不断检查自己是否仍在解决最初的问题。如果答案变了，就把变化记录下来，再选择下一步。' },
  ] },
  { id: 'fixture-note-002', schemaVersion: 1, revision: 'fixture-r2', kind: 'fixture', maturity: '示例', topics: [], relatedWorkIds: [], slug: 'slowly-create', title: '让喜欢的事，慢慢变成作品', summary: '关于创作节奏、持续尝试，以及不着急的进步。', type: '短记录', date: '2026.10.20', update: '记录关于创作节奏的思考。', sections: [
    { id: 'pace', title: '找到自己的节奏', text: '创作不必每次都从完整的计划开始。留出一点可持续的时间，让喜欢的事有机会被反复接近。' },
    { id: 'practice', title: '把尝试留在过程里', text: '一个小练习也值得被记录：做了什么、遇到了什么问题，以及下次想如何调整。' },
    { id: 'continue', title: '允许慢慢完成', text: '不必把每一次尝试都包装成成果。先让它保持可继续的状态，再决定什么时候整理和分享。' },
  ] },
  { id: 'fixture-note-003', schemaVersion: 1, revision: 'fixture-r2', kind: 'fixture', maturity: '示例', topics: [], relatedWorkIds: [], slug: 'building-home', title: '给自己搭一个长期的小站', summary: '从内容出发，让设计服务于每一次表达。', type: '建站手记', date: '2026.10.12', update: '整理个人空间的建设方向。', sections: [
    { id: 'purpose', title: '先想清楚为什么建站', text: '个人网站是整理作品与思考的空间。希望访客先认识创作者，再从作品中了解过程和选择。' },
    { id: 'structure', title: '给内容一个清楚的位置', text: '首页负责介绍与精选，作品归档便于完整浏览，记录为尚在成长的想法留出空间。' },
    { id: 'maintenance', title: '让它能够长期维护', text: '内容与程序需要各自清晰的更新方式；真实资料准备好后，再逐步替换这些设计示例。' },
  ] },
];


export const siteData: SiteData = {
  schemaVersion: 1, revision: 'fixture-r2',
  settings: {
    name: '世纪末之青', avatar: '/assets/character-avatar.png', description: '项目、创作与思考。把好奇心，做成作品。',
    shareImage: '/assets/01-collecting-ideas.png',
    navigation: [{label:'首页',href:'/'},{label:'作品',href:'/works'},{label:'记录',href:'/notes'},{label:'关于',href:'/about'}],
    contacts: [], contactHeading: '聊聊你的想法', contactIntro: '欢迎交流作品、分享反馈，或一起探讨有趣的问题。',
    contactMissing: '邮箱和社交地址尚待提供，确认后在这里展示。',
    footerTitle: '下一个想法，也许从这里开始。', footerTagline: '项目 / 创作 / 思考',
    backendNotice: '后台尚未实现；后续仅在本机测试，远程入口待上线阶段配置。',
    missingTitle: '没有找到这个页面', missingText: '页面可能不存在，或暂时不可访问。可以返回首页，也可以看看作品。',
    emptyWorks: '作品正在整理中，确认内容后会在这里展示。', emptyNotes: '还没有公开记录，欢迎稍后再来。',
  },
  home: {
    greeting: '你好，我是之青', titleLines: ['把好奇心，','做成作品。'],
    description: ['在这里记录项目、创作与思考。','从一个想法开始，慢慢把它变成看得见的东西。'],
    image: '/assets/01-collecting-ideas.png', imageAlt: '之青在桌前整理并连接灵感便笺',
    imageCaption: '把灵感收集起来，慢慢做成作品。',
    actions: [{label:'看看作品',target:{kind:'path',path:'/works'}},{label:'认识一下之青',target:{kind:'path',path:'/about'}}],
    featuredWorkIds: ['fixture-work-001','fixture-work-002'],
    sections: ['works','updates','about'], worksTitle: '一些正在成形的想法', updatesTitle: '最近更新',
    now: {enabled:true,title:'正在搭建自己的小站。',text:'一点点整理想法、作品和故事，让它们在这里有个安放的地方。',dateLabel:'示例近况 · 更新时间待确认'},
    aboutTitle: ['保持好奇，','慢慢生长'],
    aboutParagraphs: ['我是之青。喜欢观察细小的事物，也喜欢把脑海中的想法一步步做出来。','这里是一个记录过程的地方：不必急着给所有事情答案，先动手，再继续探索。'],
  },
  about: {
    eyebrow:'ABOUT / 你好，我是之青', titleLines:['保持好奇，','认真创造'],
    description:['这里是我的长期个人空间。','用作品记录探索，也用文字留下思考。'],
    sections:[{id:'interests',title:'我在关注什么',paragraphs:['产品、创作，以及把一个想法变成作品的过程。希望从日常的小问题里，找到值得动手尝试的方向。']},{id:'approach',title:'我喜欢的工作方式',paragraphs:['先理解问题，再做一个足够小的尝试。让反馈推动下一步，也为修改原来的想法留出余地。']}],
  },
};
