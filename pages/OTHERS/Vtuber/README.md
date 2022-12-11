

## 1. 在模型中添加mapper文件

```json
{
  	## 这个参数需要你使用官方工具打开获取，parameter中对象的key不可修改，value根据你模型的情况对应修改即可
    "parameter": [
        {
            "ParamAngleX": "PARAM_ANGLE_X"
        },
        {
            "ParamAngleY": "PARAM_ANGLE_Y"
        },
        {
            "ParamAngleZ": "PARAM_ANGLE_Z"
        },
        {
            "ParamEyeBallX": "PARAM_EYE_BALL_X"
        },
        {
            "ParamBodyAngleX": "PARAM_BODY_ANGLE_X"
        },
        {
            "ParamEyeBallY": "PARAM_EYE_BALL_Y"
        }
    ],
## 暂时不可用，等待后续更新
    "url": [
        {
            "motions/Mgirl10_tingge.motion3.json": "motions/Mgirl10_tingge.motion3.json"
        },
        {
            "l2d01.u.moc3": "l2d01.u.moc3"
        },
        {
            "textures/texture_00.png": "textures/texture_00.png"
        }
    ],
## 修改模型的中心点位置，大于0即可，合适范围为[0,16]，一般取值[0,8]
    "center":[2,1],
##模型的放大倍率，默认为1，修改后center属性设置[1，1]代表模型居中
		"model_scale":2
		
}
```

##  2. 引入相关文件

- bundle.js
- assets/waifu-tips.js
- live2dcubismcore.js
- assets/waifu.css

## 3. 调用initModel进行资源路径设置和模型设置

这里偷个懒，放配置好的一个html页面内容

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text
                                           /html; charset=UTF-8" />
  <title>Live2D 看板娘 v1.2 / Demo</title>
  <!-- 下面两个一定要加上 -->
  <link rel="stylesheet" type="text/css" href="./live2d/assets/waifu.css"/>
  <script src="https://cdn.bootcss.com/jquery/3.2.1/jquery.min.js"></script>
</head>
<body>
  <div class="waifu">
    <div class="waifu-tips"></div>
    <canvas id="live2d" width="280" height="250" class="live2d"></canvas>
    <div class="waifu-tool">
        <span class="fui-home"></span>
        <span class="fui-chat"></span>
        <span class="fui-eye"></span>
        <span class="fui-user"></span>
        <span class="fui-photo"></span>
        <span class="fui-info-circle"></span>
        <span class="fui-cross"></span>
    </div>
</div>
  <!-- Live2DCubismCore script -->
<script src="../../../Core/live2dcubismcore.js"></script>
  <!-- Build script -->
  <script src = "./dist/bundle.js"></script>
  <script src="live2d/assets/waifu-tips.js"></script>
  <script type="text/javascript">
    //必选参数
    let modulesPath = "./live2d/models/"
    let modelNames = ['a','b']  //注意，这里的名字是存放你模型文件的主目录的名字，目录中的moc3.json文件的名字一定要与目录同名
    //可选参数
    let waifuTipsUrl = "./live2d/assets/waifu-tips.json"

    initModel(modulesPath,modelNames,waifuTipsUrl);
  </script>
</body>
</html>

```

### 有问题可以提交issue或者去b站私信

 **[GitHub地址](https://github.com/cqc233/live2dDemo)**

 **[哔哩哔哩](https://space.bilibili.com/42800229)**

https://github.com/cqc233/live2dDemo/releases





