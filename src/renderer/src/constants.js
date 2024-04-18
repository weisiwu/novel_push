const platformNames = {
  BILIBILI: 'bilibili',
  XIGUA: 'xigua',
  DOUYIN: 'douyin',
  KUAISHOU: 'kuaishou'
}

const support_distribute_platforms = [
  { name: 'bilibili', name_cn: '哔哩哔哩' },
  { name: 'xigua', name_cn: '西瓜视频' },
  { name: 'douyin', name_cn: '抖音' },
  { name: 'kuaishou', name_cn: '快手' }
]

const PLATFORM_APIS = {
  BILIBILI: {
    login_html: 'https://passport.bilibili.com/login',
    login_api: 'https://passport.biligame.com/x/passport-login/web/sso/set',
    is_login_api: 'https://api.bilibili.com/x/web-interface/nav'
  },
  XIGUA: {
    login_html: 'https://studio.ixigua.com/',
    is_login_api: 'https://studio.ixigua.com/api/feedbacks/getUnreadFeedback',
    fetch_activity_list:
      'https://studio.ixigua.com/api/activity/list?AppId=0&NewXigua=true&act_status=2&category=%E5%85%A8%E9%83%A8&limit=15&media_id=0&offset=0&part_status=0&title='
  },
  DOUYIN: { login_html: '', login_api: '' },
  KUAISHOU: { login_html: '', login_api: '' }
}

// 处理视频指令集
const CMDS = {
  // 移除已上传视频完成指令
  RM_SUCCESS_VIDEOS: 'wswTest:[action=remove_success_videos]',
  // 上传进度指令
  UPLOAD_PROGRESS: 'wswTest[action=progress]',
  // 视频处理进度结果指令，指令末尾_1表示该步骤处理成功
  HANDLE_VIDEO_STEP_PROGRESS: 'wswTest:[action=handle_video_step_progress]',
  // 关闭无头浏览器指令
  CLOSE_BROWSER: 'wswTest:[action=close_browser]'
}

export { platformNames, support_distribute_platforms, CMDS, PLATFORM_APIS }
