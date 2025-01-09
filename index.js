/** @format */

const list = require('./最热小说列表.json');

console.log(
  list?.data?.list?.vlist?.slice?.(0, 10)?.map((item) => {
    const [tm, s] = item.length.split(':');
    const h = Math.floor(tm / 60);
    return {
      title: item.title,
      length: `${h}小时${tm - h * 60}分钟${s}秒`,
      url: `https://www.bilibili.com/video/${item?.bvid}/`,
      play: item.play / 1e4 + '万次',
    };
  })
);
