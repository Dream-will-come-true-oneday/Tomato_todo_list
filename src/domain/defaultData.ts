import type { AppData, BacklogItem, DailyScheduleItem, DailyScheduleSettings, InspirationTag, TimerPreset, Todo, TodoTypeTag } from './types';

const nowIso = () => new Date().toISOString();
const scheduleItem = (id: string, startTime: string, endTime: string | null, title: string, rule: string): DailyScheduleItem => ({
  id,
  startTime,
  endTime,
  title,
  rule,
  enabled: true
});

export const DEFAULT_DAILY_SCHEDULE_ITEMS: DailyScheduleItem[] = [
  scheduleItem('schedule-wake', '07:30', '08:00', '起床、洗漱，温水 + 少量坚果', '醒来不刷短视频、不看行情'),
  scheduleItem('schedule-breakfast', '08:00', '08:30', '早餐', '放缓节奏'),
  scheduleItem('schedule-goals', '08:30', '08:35', '制定今日 2 件核心目标', '只写 2 件，拒绝任务泛滥'),
  scheduleItem('schedule-deep-1', '08:35', '09:25', '深度块 1【高难度】算法 / 架构 / 复杂代码', '手机勿扰，关闭资讯、基金页面'),
  scheduleItem('schedule-break-1', '09:25', '09:35', '休息', '站立走动、远眺，禁止短视频'),
  scheduleItem('schedule-deep-2', '09:35', '10:25', '深度块 2【高难度】', '持续攻坚项目 / 八股难点'),
  scheduleItem('schedule-break-2', '10:25', '10:35', '休息', '放松眼球'),
  scheduleItem('schedule-deep-3', '10:35', '11:25', '深度块 3【高难度】', ''),
  scheduleItem('schedule-lunch', '11:25', '14:00', '午饭 + 午休', '午休 20～35 分钟，别睡太久'),
  scheduleItem('schedule-work-4', '14:00', '14:50', '工作块 4【中等难度】调试 bug、文档、简历、技术阅读', ''),
  scheduleItem('schedule-break-3', '14:50', '15:00', '休息', ''),
  scheduleItem('schedule-work-5', '15:00', '15:50', '工作块 5【中等难度】', ''),
  scheduleItem('schedule-break-4', '15:50', '16:00', '休息', ''),
  scheduleItem('schedule-buffer', '16:00', '16:50', '机动补任务时段', '优先完成当日核心目标'),
  scheduleItem('schedule-low-intensity', '16:50', null, '低强度浏览技术资料', '不再开启高强度思考'),
  scheduleItem('schedule-long-term', '19:30', '20:00', '专属思考窗口：房产 / 理财 / 长期人生规划', '全天唯一允许思考长远规划的时段，杂念全部攒到这里'),
  scheduleItem('schedule-evening', '20:00', '21:00', '轻度运动、散步、洗澡各项杂活', '避免高强度暴汗透支精力'),
  scheduleItem('schedule-review', '21:00', '22:30', '可选：八股复盘、代码总结', '精力不足可直接休息'),
  scheduleItem('schedule-bed', '22:30', null, '减少电子屏幕，准备睡觉', '尽量 23:30 前入睡')
];

export function createDefaultDailySchedule(): DailyScheduleSettings {
  return {
    enabled: true,
    soundEnabled: true,
    desktopNotificationEnabled: false,
    autoLaunch: false,
    items: DEFAULT_DAILY_SCHEDULE_ITEMS.map((item) => ({ ...item }))
  };
}

export const DEFAULT_PRESETS: TimerPreset[] = [
  {
    id: 'preset-study',
    name: '静读',
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
    autoStartNextPhase: false,
    soundEnabled: true
  },
  {
    id: 'preset-coding',
    name: '研习',
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    longBreakInterval: 3,
    autoStartNextPhase: false,
    soundEnabled: true
  },
  {
    id: 'preset-writing',
    name: '执笔',
    focusMinutes: 35,
    shortBreakMinutes: 7,
    longBreakMinutes: 20,
    longBreakInterval: 3,
    autoStartNextPhase: false,
    soundEnabled: true
  },
  {
    id: 'preset-light',
    name: '小憩',
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    longBreakInterval: 4,
    autoStartNextPhase: false,
    soundEnabled: true
  }
];

export function createDefaultTodo(
  title = '整理今日计划',
  options: Partial<
    Pick<Todo, 'parentId' | 'term' | 'urgencyTags' | 'typeTagIds' | 'startAt' | 'dueAt' | 'notes' | 'status'>
  > = {}
): Todo {
  const createdAt = nowIso();
  return {
    id: `todo-${crypto.randomUUID()}`,
    title,
    notes: options.notes ?? '',
    status: options.status ?? 'notStarted',
    priority: 'medium',
    parentId: options.parentId ?? null,
    term: options.term ?? 'short',
    urgencyTags: options.urgencyTags ?? [],
    typeTagIds: options.typeTagIds ?? [],
    startAt: options.startAt ?? null,
    dueAt: options.dueAt ?? null,
    order: null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    pomodoroCount: 0,
    checkInDates: []
  };
}

export function createTypeTag(name: string, color = '#9b2f25'): TodoTypeTag {
  return {
    id: `tag-${crypto.randomUUID()}`,
    name,
    color,
    createdAt: nowIso()
  };
}

export function createBacklogItem(title: string): BacklogItem {
  const createdAt = nowIso();
  return {
    id: `backlog-${crypto.randomUUID()}`,
    title,
    status: 'active',
    tagId: null,
    completionDetails: '',
    createdAt,
    updatedAt: createdAt
  };
}

export function createInspirationTag(name: string, color = '#315f4d'): InspirationTag {
  return {
    id: `inspiration-tag-${crypto.randomUUID()}`,
    name,
    color,
    createdAt: nowIso()
  };
}

export function createDefaultAppData(): AppData {
  const presets = DEFAULT_PRESETS.map((preset) => ({ ...preset }));
  return {
    version: 8,
    presets,
    todos: [createDefaultTodo()],
    typeTags: [
      {
        id: 'tag-reading',
        name: '读书',
        color: '#8b5f2a',
        createdAt: nowIso()
      },
      {
        id: 'tag-work',
        name: '事务',
        color: '#315f4d',
        createdAt: nowIso()
      }
    ],
    reflections: [],
    weeklyReflections: [],
    backlogItems: [],
    inspirationTags: [],
    pomodoroRecords: [],
    todayPlans: {},
    dailySchedule: createDefaultDailySchedule(),
    activePresetId: presets[0].id,
    todoSortMode: 'schedule'
  };
}
