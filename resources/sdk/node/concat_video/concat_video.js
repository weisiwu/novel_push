const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')

const frameRate = 30
const audioPath = '/Users/siwu/Desktop/github/novel_push/output.wav'
const outputPath =
  '/Users/siwu/Desktop/github/novel_push/resources/sdk/node/concat_video/output.mp4'
// 设置 ffmpeg 的路径
ffmpeg.setFfmpegPath(ffmpegStatic)

function concatVideo(data) {
  const images = data?.filter?.((item) => item?.image) || []

  const videoPath = 'output.mp4'
  const frameRate = 25

  // 构建用于 concat 的 filter complex 字符串
  let filterComplex = images
    .map((image, index) => {
      // 假设所有图片的尺寸和格式都是一样的，并且不需要缩放
      return `[${index}:v]trim=duration=${image.duration},setpts=PTS-STARTPTS[v${index}];`
    })
    .join('')

  // 添加用于 concat 的部分，确保正确设置序列
  filterComplex +=
    images.map((_, index) => `[v${index}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv]`

  // 创建 ffmpeg 命令并设置输入
  const command = ffmpeg()
  images.forEach((image, index) => {
    command.input(image.image).inputOptions(['-loop 1', `-t ${image.duration}`, `-r ${frameRate}`])
  })

  // 应用 filter_complex，并确保输出标签名
  command
    .complexFilter(filterComplex, 'outv')
    .outputOptions(['-map [outv]', '-c:v libx264', '-pix_fmt yuv420p', '-r 25'])
    .output(videoPath)
    .on('error', (err) => console.error(`Error: ${err.message}`))
    .on('end', () => console.log('Video created successfully!'))
    .run()
}

const demo = [
  {
    id: 1,
    text: '',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      'Lingyao tidied her fairy clothes and turned to enter the depths of the palace',
      ' preparing for the upcoming challenge.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/0.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '灵瑶整理好自己的仙衣，转身进入宫殿深处，准备着即将到来的挑战。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'Lingyao tidied her fairy clothes and turned to enter the depths of the palace',
      ' preparing for the upcoming challenge.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '“既然如此，你便准备吧。星辰大阵开启在即，我们没有太多时间。”',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'In that case',
      ' prepare yourself. The Star Array is about to open',
      " and we don't have much time left."
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/0.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '“天星宗的星辰大阵即将开启，这是千年难遇的修炼良机。”',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'The Star Array of the Tianxing Sect is about to be activated',
      ' a rare opportunity for cultivation that comes once in a millennium.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '“灵瑶仙子，此次我前来，正是为了告知你一个重大的消息。”',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'Fairy Lingyao',
      ' I have come this time to inform you of a significant message.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/0.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '紫霄龙皇落在仙宫前的广阔平台上，化为一位威严的中年男子。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'The Zi Xiao Dragon Emperor landed on the vast platform in front of the immortal palace',
      ' transforming into a dignified middle-aged man.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '那是一条紫金色的龙，龙鳞闪耀，龙角如同镶嵌了紫晶，一双龙眸中射出威严的光芒。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'It was a dragon with purple-gold scales shining',
      ' horns like embedded amethyst',
      ' and a pair of dragon eyes emitting a majestic light.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/0.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '灵瑶睁开了眼，她的眼中闪烁着智慧光芒，如同深潭中的星辰。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'Lingyao opened her eyes',
      ' her eyes shimmered with wisdom',
      ' like stars in a deep pool.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '时间仿若停滞，直到一声龙吟打破了静谧。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      "Time seemed to stand still until a dragon's roar broke the tranquility."
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/0.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '她闭目修炼，手中握着一颗莹白如玉的灵珠，珠中蕴含着磅礴的灵气。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'She is meditating with her eyes closed',
      ' holding a luminous jade-like spirit pearl',
      ' which contains immense spiritual energy.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '宫殿内，一位青袍仙子正盘膝而坐，仙子名为灵瑶，是天穹仙宫的传人。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'Inside the palace',
      ' a fairy in a green robe is sitting cross-legged',
      ' the fairy is named Lingyao',
      ' the successor of Sky Dome Immortal Palace.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/0.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '在这神秘莫测的地方，有一座玉石筑就的宫殿，名为“天穹仙宫”。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'In this mysterious and unpredictable place',
      ' there is a palace made of jade',
      " called 'Sky Dome Immortal Palace'."
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '仙气缭绕山峰，彩凤飞翔，霞光万道，瑞气千条。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'Immortal energy lingers around the peaks',
      ' colorful phoenixes fly',
      ' with myriad rays of rosy light and auspicious air.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  },
  {
    id: 1,
    text: '在古老的昆仑山脉之巅，巨大的云海翻腾，犹如海洋一般。',
    tags: [
      'HDR',
      'Best quality',
      'Masterpiece',
      'Highly detailed',
      'Professional',
      'Vivid colors',
      '',
      'On the summit of the ancient Kunlun Mountains',
      ' huge sea of clouds surges',
      ' like an ocean.'
    ],
    image: '/Users/siwu/Desktop/baogao_ai_novel_push_output/1.png',
    duration: 1,
    move: '向上',
    _X_ROW_KEY: 'row_20'
  }
]
concatVideo(demo)
