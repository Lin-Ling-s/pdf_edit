import pdf from 'vue-pdf'
import Vue from "vue";
import pdfFile from "../../../api/pdfFile";
import {Message} from "element-ui";
import listApi from "../../../api/valve_list";
import html2canvas from "html2canvas";
import JsPDF from "jspdf";
import file from "../../../api/file";
import addNewTagNumber from "../addNewTagNumber/addNewTagNumber.vue";

const PDFJS = require('pdfjs-dist');
PDFJS.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');

export default {
    name: "index",
    props: ['currentTreeId'],
    components: {
        pdf,
        addNewTagNumber
    },
    watch: {
        currentTreeId: {
            handler: function (val) {
                if (val !== '') {
                    // 将之前的输入框清空
                    document.querySelectorAll('input').forEach(item => {
                        if (item.getAttribute('inputType')) {
                            item.remove()
                        }
                    })
                    this.getDetail(this.$parent.currentTreeId)
                }
                this.currentImage = ''
                this.allCheck = true;
            },
            deep: true,
            immediate: true
        },
        currentImage: {
            handler: function (val) {
                if (val !== '') {
                    let image = new Image()
                    // 确保不会出现跨域问题   解决渲染后再次保存图层不会出错
                    image.setAttribute('crossOrigin', 'anonymous');
                    image.src = Vue.prototype.FILE_SERVER_URL + val
                    // 渲染图层
                    image.onload = () => {
                        this.ctx_back.drawImage(image, 0, 0, image.width, image.height)
                    }
                }
                else {
                    // 清空画布
                    this.ctx_front.clearRect(
                        0,
                        0,
                        this.canvas_front.width,
                        this.canvas_front.height
                    );
                    this.ctx_back.clearRect(
                        0,
                        0,
                        this.canvas_front.width,
                        this.canvas_front.height
                    );
                }
            },
            deep: true
        }
    },
    data() {
        return {
            // 父组件的数据
            row: null,
            url: '',
            // 默认光标
            cursor: 'default',
            // pdf的宽和高
            width: 0,
            height: 0,
            // 填写文字的画板
            ctx_front: null,
            canvas_front: null,
            // 保证橡皮擦不擦出pdf
            ctx_base: null,
            canvas_base: null,
            // 保存图片的画板
            ctx_back: null,
            canvas_back: null,
            // 用于在鼠标点击时判断类型
            pointType: 'default',
            // 文本
            text: '',
            // 记录文本的位置和值的Map
            textArray: null,
            // 保存每个值得id
            idArray: null,
            // 是否正在绘制
            isDrawing: false,
            // 监听对象
            observer: null,
            // 滑块默认值
            slider: 6,
            // 删除列表
            delArray: [],
            // 当前图层url
            currentImage: '',
            // 右侧列表宽度
            pdfTreeWidth: 290,
            // 位号列表
            tagList: [],
            //树状图部分默认的样式
            defaultProps: {
                children: '',
                label: 'tagNumber'
            },
            // 已选中的
            defaultChecked: [],
            checkControl: [],
            checkHand: [],
            checkSafe: [],
            check: [],
            notCheckControl: [],
            notCheckHand: [],
            notCheckSafe: [],
            notCheck: [],
            // 是否全选中
            allCheck: true,
        }
    },
    mounted() {
        let _this = this;
        // this.row = JSON.parse(localStorage.getItem('row'))
        _this.textArray = new Map()
        _this.delArray = [];
        // 处理跨域问题

        // 用于绘图
        this.canvas_front = document.getElementById("ctx_front")
        this.ctx_front = this.canvas_front.getContext('2d')
        // 屏蔽canvas的右键菜单
        this.canvas_front.oncontextmenu = (ev) => {
            return false
        }
        // 用于生成绘制后图片的画板
        this.canvas_back = document.getElementById("ctx_back")
        // 屏蔽canvas的右键菜单
        this.canvas_back.oncontextmenu = (ev) => {
            return false
        }
        this.ctx_back = this.canvas_back.getContext('2d')
        let element = document.querySelector("#pdf")
        let content = document.querySelector("#content")
        // 监听pdf组件的宽高
        this.observer = new ResizeObserver(entries => {
            // 获取宽高
            let width = getComputedStyle(element).getPropertyValue('width').split('px')[0]
            let height = getComputedStyle(element).getPropertyValue('height').split('px')[0]
            _this.canvas_front.width = width
            _this.canvas_front.height = height
            _this.canvas_back.width = width
            _this.canvas_back.height = height
            content.style.height = height + 'px'
            content.style.width = width + 'px'
            // 用于橡皮擦不擦出pdf效果
            // this.canvas_base = document.querySelector("canvas")
            // this.ctx_base = this.canvas_base.getContext('2d')
            // _this.canvas_base.width = width
            // _this.canvas_base.height = height
            if (_this.currentImage !== '') {
                let image = new Image()
                // 确保不会出现跨域问题   解决渲染后再次保存图层不会出错
                image.setAttribute('crossOrigin', 'anonymous');
                image.src = Vue.prototype.FILE_SERVER_URL + _this.currentImage
                // 渲染图层
                image.onload = () => {
                    _this.ctx_back.drawImage(image, 0, 0, image.width, image.height)
                }
            }
        })
        this.observer.observe(element)
        window.onresize = () => {
            // _this.canvas_front.width = document.getElementById("pdf").offsetWidth
            // _this.canvas_front.height = document.getElementById("pdf").offsetHeight
            // document.getElementById("contentCanvas").width = document.getElementById("pdf").offsetWidth
            // document.getElementById("contentCanvas").height = document.getElementById("pdf").offsetHeight
            // let canvasWidth = document.getElementById("ctx_front").offsetWidth
            // // pdf宽与canvas画布的宽不同  即页面进行了缩放
            // if (_this.width !== canvasWidth) {
            //     // 计算缩放比例
            //     let difference = _thiwos.width - canvasWidth
            //     let scale = Number((difference / canvasWidth).toFixed(1));
            //     this.getScale((difference / canvasWidth) + 1)
            // }
            // }
        }
        // 鼠标离开编辑框 自动失焦   保证上方的按钮一次就能按上
        document.getElementById('test1').onmouseleave = (e) => {
            let inputs = document.querySelectorAll('input')
            inputs.forEach(item => {
                item.blur()
            })
        }
    },
    beforeDestroy() {
        // 如果有，则销毁
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },
    methods: {
        // 改变右侧位号列表的宽度
        changeTreeWidth() {
            if (this.pdfTreeWidth === 0) {
                this.pdfTreeWidth = 290;
            }
            else {
                this.pdfTreeWidth = 0;
            }
        },
        // 导出
        exportPdf() {
            // let inputs = document.querySelectorAll('input')
            // if(inputs.length > 0){
            //     inputs.forEach(item => {
            //         item.style.height = '20px'
            //     })
            // }
            // 转为图片
            html2canvas(window.document.querySelector("#content"), {
                backgroundColor: null,
                width: window.document.querySelector("#content").offsetWidth,
                height: window.document.querySelector("#content").offsetHeight,
                allowTaint: false,
                useCORS: true,
            }).then((canvas) => {
                let contentWidth = canvas.width
                let contentHeight = canvas.height
                let pageHeight = contentWidth / 592.28 * 841.89
                let leftHeight = contentHeight
                let position = 0
                let imgWidth = 595.28
                let imgHeight = 592.28 / contentWidth * contentHeight
                let pageData = canvas.toDataURL('image/jpeg', 1.0)
                let PDF = new JsPDF('', 'pt', 'a4')
                if (leftHeight <= pageHeight) {
                    PDF.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight)
                }
                else {
                    while (leftHeight > 0) {
                        PDF.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight)
                        leftHeight -= pageHeight
                        position -= 841.89
                        if (leftHeight > 0) {
                            PDF.addPage()
                        }
                    }
                }
                PDF.save(this.$parent.currentTreeName)
                // canvas.toBlob((blobObj) => {
                //     const link = document.createElement('a');
                //     link.href = window.URL.createObjectURL(blobObj);
                //     link.download = 'file';
                //     //将a标签的点击事件自动触发
                //     link.click();
                //     // if(inputs.length > 0){
                //     //     inputs.forEach(item => {
                //     //         item.style.height = '16px'
                //     //         item.style.lineHeight = '16px'
                //     //     })
                //     // }
                // });
            })
            // let contentWidth = c.width
            // let contentHeight = c.height
            // const pageHeight = contentWidth / 592.28 * 841.89;
            // // 未生成pdf的html页面高度
            // let leftHeight = contentHeight;
            // // 页面偏移
            // let position = 0;
            // // a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
            // const imgWidth = 595.28;
            // const imgHeight = 592.28 / contentWidth * contentHeight;
            // // document.getElementsByClassName('back')[0].style.visibility = 'hidden'
            // const pageData = c.toDataURL('image/png');
            // // document.getElementsByClassName('back')[0].style.visibility = 'visible'
            // let pdf = new jsPDF('', 'pt', 'a4');
            // // 有两个高度需要区分，一个是html页面的实际高度，和生成pdf的页面高度(841.89)
            // // 当内容未超过pdf一页显示的范围，无需分页
            // if (leftHeight < pageHeight) {
            //     pdf.addImage(pageData, 'JPEG', 0, 0, imgWidth, imgHeight);
            // }
            // else {
            //     while (leftHeight > 0) {
            //         pdf.addImage(pageData, 'JPEG', 0, position, imgWidth, imgHeight)
            //         leftHeight -= pageHeight;
            //         position -= 841.89;
            //         // 避免添加空白页
            //         if (leftHeight > 0) {
            //             pdf.addPage();
            //         }
            //     }
            // }
            // pdf.save('测试.pdf')
        },
        // 拖动
        drag(){
            this.cursor = `url(../../../../static/project/images/hand.ico), auto`
            let content = document.getElementById('content')
            content.onmousedown = (e) => {
                // 阻止拖动时选中其他元素
                e.preventDefault()
                // 获取开始坐标
                let sx = e.clientX - content.offsetLeft;
                let sy = e.clientY - content.offsetTop;
                document.onmousemove = (e) => {
                    let left = e.clientX - sx
                    let top = e.clientY - sy
                    content.style.left = left + 'px'
                    content.style.top = top + 'px'
                }
                document.onmouseup = (e) => {
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            }
        },
        // 箭头
        arrowClick() {
            // 绘图标志
            this.cursor = `crosshair`
            let sx, sy, mx, my;
            // 绘图标志
            this.cursor = `crosshair`
            let content = document.getElementById('content')
            let _this = this
            // 鼠标点击事件
            let mousedown = (e) => {
                e = e || window.event;
                // 获取开始坐标
                sx = e.offsetX
                sy = e.offsetY
                _this.isDrawing = true;
                _this.ctx_back.globalCompositeOperation = 'source-over'
            }
            // 鼠标移动
            let mousemove = (e) => {
                e = e || window.event;
                mx = e.offsetX
                my = e.offsetY
                if (_this.isDrawing) {
                    _this.ctx_back.globalCompositeOperation = 'source-over'
                    let angle = Math.atan2(my - sy, mx - sx) / Math.PI * 180,
                        angle1 = Math.PI / 180 * (angle + 15),
                        angle2 = Math.PI / 180 * (angle - 15),
                        topX = mx - 18 * Math.cos(angle1),
                        topY = my - 18 * Math.sin(angle1),
                        botX = mx - 18 * Math.cos(angle2),
                        botY = my - 18 * Math.sin(angle2);
                    _this.clearCavansFront()
                    _this.ctx_front.beginPath();
                    _this.ctx_front.lineWidth = 3
                    _this.ctx_front.strokeStyle = 'rgba(0, 0, 255, .5)'
                    _this.ctx_front.moveTo(sx, sy);
                    _this.ctx_front.lineTo(mx, my);
                    _this.ctx_front.moveTo(topX, topY)
                    _this.ctx_front.lineTo(mx, my);
                    _this.ctx_front.moveTo(botX, botY)
                    _this.ctx_front.lineTo(mx, my);
                    _this.ctx_front.stroke();
                    // let el = 50, al = 15, vertex = []
                    // vertex[0] = sx, vertex[1] = sy, vertex[6] = mx, vertex[7] = my;
                    // //计算起点坐标与X轴之间的夹角角度值
                    // let angle = Math.atan2(my - sy, mx - sx) / Math.PI * 180;
                    // let x = mx - sx, y = my - sy, length = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
                    // if (length < 250) {
                    //     el /= 2, al / 2;
                    // }
                    // else if (length < 500) {
                    //     el *= length / 500, al *= length / 500;
                    // }
                    // vertex[8] = mx - el * Math.cos(Math.PI / 180 * (angle + al));
                    // vertex[9] = my - el * Math.sin(Math.PI / 180 * (angle + al));
                    // vertex[4] = mx - el * Math.cos(Math.PI / 180 * (angle - al));
                    // vertex[5] = my - el * Math.sin(Math.PI / 180 * (angle - al));
                    // //获取另外两个顶点坐标
                    // x = (vertex[4] + vertex[8]) / 2, y = (vertex[5] + vertex[9]) / 2;
                    // vertex[2] = (vertex[4] + x) / 2;
                    // vertex[3] = (vertex[5] + y) / 2;
                    // vertex[10] = (vertex[8] + x) / 2;
                    // vertex[11] = (vertex[9] + y) / 2;
                    // //  清空画布
                    // _this.clearCavansFront()
                    // _this.ctx_front.beginPath();
                    // _this.ctx_front.moveTo(vertex[0], vertex[1]);
                    // _this.ctx_front.lineTo(vertex[2], vertex[3]);
                    // _this.ctx_front.lineTo(vertex[4], vertex[5]);
                    // _this.ctx_front.lineTo(vertex[6], vertex[7]);
                    // _this.ctx_front.lineTo(vertex[8], vertex[9]);
                    // _this.ctx_front.lineTo(vertex[10], vertex[11]);
                    // _this.ctx_front.lineWidth = 3
                    // _this.ctx_front.strokeStyle = 'rgba(0, 0, 255, .5)'
                    // _this.ctx_front.closePath();
                    // _this.ctx_front.stroke();
                }
            }
            // 鼠标抬起
            let mouseup = (e) => {
                _this.isDrawing = false
                _this.ctx_front.closePath()
                _this.handleSaveCanvasStore()
                // _this.ctx_back.fillRect(50, 50, 50, 50);
            }
            content.onmousedown = (e) => mousedown(e)
            content.onmousemove = (e) => mousemove(e)
            content.onmouseup = (e) => mouseup(e)
        },
        // 绘制方框
        boxClick() {
            let sx, sy, mx, my;
            // 绘图标志
            this.cursor = `crosshair`
            let content = document.getElementById('content')
            let _this = this
            // 鼠标点击事件
            let mousedown = (e) => {
                e = e || window.event;
                // 获取开始坐标
                sx = e.offsetX
                sy = e.offsetY
                _this.isDrawing = true;
                _this.ctx_back.globalCompositeOperation = 'source-over'
            }
            // 鼠标移动
            let mousemove = (e) => {
                e = e || window.event;
                mx = e.offsetX
                my = e.offsetY
                if (_this.isDrawing) {
                    _this.ctx_back.globalCompositeOperation = 'source-over'
                    //  清空画布
                    _this.clearCavansFront()
                    _this.ctx_front.beginPath();
                    _this.ctx_front.moveTo(sx, sy);
                    _this.ctx_front.fillStyle = 'rgba(255, 255, 11, .5)'
                    _this.ctx_front.fillRect(sx, sy, mx - sx, my - sy);
                    _this.ctx_front.lineWidth = 3
                    _this.ctx_front.strokeStyle = 'rgba(0, 0, 255, .5)'
                    _this.ctx_front.strokeRect(sx, sy, mx - sx, my - sy);
                }
            }
            // 鼠标抬起
            let mouseup = (e) => {
                _this.isDrawing = false
                _this.ctx_front.closePath()
                _this.handleSaveCanvasStore()
            }
            content.onmousedown = (e) => mousedown(e)
            content.onmousemove = (e) => mousemove(e)
            content.onmouseup = (e) => mouseup(e)
        },
        // 橡皮
        eraserClick() {
            let sx, sy, mx, my;
            // 绘图标志
            this.cursor = `url(../../../../static/project/images/eraser.ico), auto`
            let content = document.getElementById('content')
            let _this = this
            // 鼠标点击事件
            let mousedown = (e) => {
                e = e || window.event;
                // 获取开始坐标
                sx = e.offsetX
                sy = e.offsetY
                _this.isDrawing = true;
                // 不擦出背景pdf
                _this.ctx_back.globalCompositeOperation = 'destination-out'
                _this.ctx_back.beginPath()
                _this.ctx_back.fillStyle = 'white'
                _this.ctx_back.arc(sx, sy, _this.slider, 0, 2 * Math.PI)
                _this.ctx_back.closePath()
                _this.ctx_back.fill()
                // const cbx = _this.ctx_base.getImageData(
                //     e.offsetX - _this.slider / 2,
                //     e.offsetY - _this.slider / 2,
                //     _this.slider * 2,
                //     _this.slider * 2
                // )
                // _this.ctx_front.putImageData(
                //     cbx,
                //     e.offsetX - _this.slider / 2,
                //     e.offsetY - _this.slider / 2,
                // );

            }
            // 鼠标移动
            let mousemove = (e) => {
                e = e || window.event;
                mx = e.offsetX
                my = e.offsetY
                // const cbx = _this.ctx_base.getImageData(
                //     e.offsetX - _this.slider / 2,
                //     e.offsetY - _this.slider / 2,
                //     _this.slider * 2,
                //     _this.slider * 2
                // )
                if (_this.isDrawing) {
                    // _this.ctx_front.putImageData(
                    //     cbx,
                    //     e.offsetX - _this.slider / 2,
                    //     e.offsetY - _this.slider / 2,
                    // );
                    //  清空画布
                    // 不擦出背景pdf
                    _this.ctx_back.globalCompositeOperation = 'destination-out'
                    _this.ctx_back.beginPath()
                    _this.ctx_back.fillStyle = 'white'
                    _this.ctx_back.arc(mx, my, _this.slider, 0, 2 * Math.PI)
                    _this.ctx_back.closePath()
                    _this.ctx_back.fill()
                }
            }
            // 鼠标抬起
            let mouseup = (e) => {
                _this.isDrawing = false
                // _this.handleSaveCanvasStore()
            }
            content.onmousedown = (e) => mousedown(e)
            content.onmousemove = (e) => mousemove(e)
            content.onmouseup = (e) => mouseup(e)
        },
        // 更新pdf
        httpRequest(e) {
            let fileData = new FormData()
            let _this = this;
            fileData.append('file', e.file)
            let data = {
                file: fileData,
                isUploadFile: true,
            }
            file.uploadFile(data, res1 => {
                // 上传成功   调用绑定接口  绑定图片路径和pidId
                pdfFile.updatePdfFile({
                    oldFileId: _this.currentTreeId,
                    newFileId: res1.id,
                    newFileName: res1.name,
                }, res => {
                    _this.$parent.editableTabs.forEach((item, index) => {
                        if (item.id === _this.currentTreeId) {
                            const obj = {
                                closable: true,
                                id: res1.id,
                                label: res1.name,
                                nodeId: res1.id,
                                childrenList: null,
                                nodeName: res1.name,
                                nodeVal: null
                            }
                            _this.$set(_this.$parent.editableTabs, index, obj)
                        }
                    })
                    // 刷新左侧的pdf列表
                    _this.$parent.getTreeData()
                    _this.$parent.currentTreeId = res1.id
                    _this.$parent.currentTreeName = res1.name
                })
            })
        },
        // 导入文件触发
        handleChange(file, fileList) {
            let size = file.size / 1024 / 1024 <= 500
            if (!file) {
                Message({
                    message: "还没有选择文件！",
                    type: 'warning',
                    duration: 2 * 1000
                })
                this.isImporting = false
            }
            // 格式不正确
            else if (!/\.(pdf)$/.test(file.name.toLowerCase())) {
                // 格式不正确提示
                Message({
                    message: "上传格式不正确，请上传pdf格式",
                    type: 'error',
                    duration: 2 * 1000
                })
            }
            else if (!size) {
                this.$message.error('上传文件大小不能超过 500MB')
                file = null
            }
        },
        // 保存图层以及文本
        savePdf() {
            let _this = this;
            let inputs = document.querySelectorAll('input')
            inputs.forEach(item => {
                // 判断是否为pdf里的input
                if (item.getAttribute('inputType')) {
                    // 如果有id  修改
                    if (item.getAttribute('pidId')) {
                        this.updateValue(item)
                    }
                    else {
                        // 判断位号是否已经存在  若位号存在则添加数据
                        if (item.getAttribute('tagId') !== '') {
                            this.insertValue(item)
                        }
                    }
                }

            })
            // 判断有无删除的数据
            let del = []
            this.delArray.forEach(item => {
                del.push(item)
            })
            del.forEach((item, index) => {
                let data = {
                    pidId: item
                }
                pdfFile.deletePidFile(data, res => {
                    if (_this.delArray.indexOf(item) > -1) {
                        _this.delArray.splice(index, 1)
                    }
                })
            })
            let blank = document.createElement('canvas');//系统获取一个空canvas对象
            blank.width = this.canvas_back.width;
            blank.height = this.canvas_back.height;
            // 先判断canvas画布是否为空
            if (this.canvas_back.toDataURL() === blank.toDataURL()) {
                pdfFile.updatePicInfo({
                    fileId: _this.$parent.currentTreeId,
                    picturePath: ''
                }, res => {
                    Message({
                        type: 'success',
                        message: '保存成功',
                        showClose: true,
                        duration: 2000
                    })
                })
            }
            else {
                // 保存图层
                let image = new Image()
                image.src = this.canvas_back.toDataURL()
                let fileData = new FormData()
                let arr = this.canvas_back.toDataURL().split(',')
                let mime = arr[0].match(/:(.*?);/)[1]
                let suffix = mime.split('/')[1]
                let bstr = atob(arr[1])
                let n = bstr.length
                let u8arr = new Uint8Array(n)
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n)
                }
                let fileTest = new File([u8arr], 'text.png', {type: mime})
                fileData.append('file', fileTest)
                let data = {
                    file: fileData,
                    isUploadFile: true,
                }
                file.uploadFile(data, res => {
                    // 上传成功   调用绑定接口  绑定图片路径和pidId
                    pdfFile.updatePicInfo({
                        fileId: _this.$parent.currentTreeId,
                        picturePath: res.path
                    }, res => {
                        Message({
                            type: 'success',
                            message: '保存成功',
                            showClose: true,
                            duration: 2000
                        })
                    })
                })
            }

        },
        // 保存绘制
        handleSaveCanvasStore() {
            let url = this.canvas_front.toDataURL()
            let image = new Image()
            image.src = url
            let _this = this;
            image.onload = () => {
                _this.clearCavansFront()
                _this.ctx_back.drawImage(image, 0, 0, image.width, image.height)
            }
        },
        // 清空画布
        clearCavansFront() {
            this.ctx_front.clearRect(
                0,
                0,
                this.canvas_front.width,
                this.canvas_front.height
            );
        },
        // 新增位号
        addNewTagNumber() {
            let tree = this.$parent.$refs.getPdfTree
            let form = {}
            // 有列
            if(Number(tree.store.currentNode.level) === 4){
                for(let i = Number(tree.store.currentNode.level); i > 1; i--){
                    switch (i){
                        case 4:
                            form.vColumn = tree.store.currentNode.parent.data.nodeName
                            break
                        case 3:
                            form.unit = tree.store.currentNode.parent.parent.data.nodeName
                            break
                        case 2:
                            form.position = tree.store.currentNode.parent.parent.parent.data.nodeName
                            break
                        default:
                            break
                    }
                }
            }
            // 无列
            else{
                for(let i = Number(tree.store.currentNode.level); i > 1; i--){
                    switch (i){
                        case 3:
                            form.unit = tree.store.currentNode.parent.data.nodeName
                            break
                        case 2:
                            form.position = tree.store.currentNode.parent.parent.data.nodeName
                            break
                        default:
                            break
                    }
                }
            }
            this.$refs.addNewTagNumber.init(form, this.currentTreeId)
        },
        // 将文本框转为纯文本
        inputToText() {
            let _this = this
            let content = document.getElementById("content");
            let inputs = document.querySelectorAll('input')
            inputs.forEach(item => {
                item.readOnly = true;
                item.style.cursor = 'default'
                item.onclick = function () {
                    if (item.getAttribute('valveId') !== 'null') {
                        let routeData = _this.$router.resolve({
                            name: 'valve_list',
                            params: {
                                valveId: item.getAttribute('valveId'),
                                tagId: item.getAttribute('tagId'),
                                tagNumber: item.value
                            },
                            query: {
                                valveId: item.getAttribute('valveId'),
                                tagId: item.getAttribute('tagId'),
                                tagNumber: item.value
                            }
                        })
                        window.open(routeData.href, '_blank');
                    }
                    else {
                        Message({
                            type: 'warning',
                            message: '此位号暂无阀门信息',
                            showClose: true,
                            duration: 2000
                        })
                    }
                }
            })
        },
        // 文本转文本框
        textToInput() {
            let content = document.getElementById("content");
            let inputs = document.querySelectorAll('input')
            inputs.forEach(item => {
                item.readOnly = ''
                item.style.cursor = "text"
                item.onclick = function () {

                }
            })
        },
        // 切换到默认样式
        defaultClick() {
            this.cursor = `default`
            this.pointType = "default"
            document.getElementById("hidden").style.height = '40px'
            document.getElementById("test1").style.top = '40px'
            // 判断文本框的个数
            if (this.textArray.size > 0) {
                // 禁用输入框
                this.inputToText()
            }
        },
        editClick(){
            this.pointType = "text"
            document.getElementById("hidden").style.height = '80px'
            document.getElementById("test1").style.top = '80px'

            // 判断已有的文本框个数
            // 判断文本框的个数
            if (this.textArray.size > 0) {
                // 输入框可输入
                this.textToInput()
            }
        },
        textClick() {
            this.cursor = `text`
            let sx, sy;
            let content = document.getElementById("content");
            let label = document.getElementById("label");
            let _this = this;
            // 鼠标按下事件
            let mousedown = (e) => {
                if (_this.pointType === 'text' && e.target.nodeName !== 'INPUT') {
                    e = e || window.event;
                    sx = e.offsetX
                    sy = e.offsetY - 6
                    let text = document.createElement('input')
                    text.setAttribute('type', "text")
                    text.setAttribute('id', sx + '_' + sy)
                    text.setAttribute('inputType', 'pdfInput')
                    // 定位到鼠标点击位置
                    // _this.ctx_front.moveTo(sx, sy)
                    text.value = ''
                    // text.style.border = "none"
                    text.style.backgroundColor = "transparent"
                    text.style.fontSize = '14px';
                    text.style.lineHeight = '20px';
                    text.style.height = '20px';
                    text.style.color = "#000";
                    text.style.left = sx + 'px'
                    text.style.top = sy + 'px'
                    text.style.display = "block";
                    text.style.position = "absolute";
                    text.style.zIndex = '99'
                    // 实时监控输入框中的值
                    text.addEventListener('input', function () {
                        label.innerHTML = text.value
                        text.style.width = label.offsetWidth + 'px'
                        text.title = text.value
                        _this.textArray.set(text.getAttribute('id'), text.value)
                    }, false)
                    text.onclick = function () {
                    }
                    text.onblur = function () {
                        // 去掉输入值中的前后空格
                        text.value = text.value.replace(/(^\s*)|(\s*$)/g, "")
                        // 若为空  则删除节点
                        if (text.value === '' || text.value === null) {
                            // 判断数组中是否有该元素
                            if (text.getAttribute('pidId') && _this.delArray.indexOf(text.getAttribute('pidId')) === -1) {
                                _this.delArray.push(text.getAttribute('pidId'))
                            }
                            // 判断位号列表是否存在  存在取消选择
                            if (text.getAttribute('tagNumber')) {
                                _this.cancelChecked(text.getAttribute('tagNumber'))
                            }
                            text.remove()
                            _this.textArray.delete(text.getAttribute('id'))
                            // _this.deteleValue(text)
                        }
                        else {
                            _this.textArray.set(text.getAttribute('id'), text.value)
                            // 检测位号是否存在
                            listApi.searchTagNumber({tagNumber: text.value}, res => {
                                if (res.tagExist === false) {
                                    Message({
                                        type: 'warning',
                                        message: '该阀门位号不存在',
                                        showClose: true,
                                        duration: 2000
                                    });
                                    // 判断位号列表是否存在  存在取消选择
                                    if (text.getAttribute('tagNumber')) {
                                        _this.cancelChecked(text.getAttribute('tagNumber'))
                                    }
                                    text.setAttribute('tagId', '')
                                    text.setAttribute('valveId', '')
                                    text.setAttribute('score', '')
                                    text.setAttribute('valveKind', '')
                                    text.style.backgroundColor = "transparent"
                                    text.style.backgroundImage = ''
                                    text.style.padding = "0 3px"
                                }
                                else {
                                    let tagNumber = text.getAttribute('tagNumber')
                                    if (tagNumber) {
                                        if (tagNumber !== text.value) {
                                            _this.cancelChecked(tagNumber)
                                            _this.setChecked(text.value)
                                        }
                                    }
                                    else {
                                        _this.setChecked(text.value)
                                    }
                                    text.setAttribute('tagNumber', text.value)
                                    text.setAttribute('tagId', res.tagId)
                                    text.setAttribute('valveId', res.valveId)
                                    text.setAttribute('score', res.valvePreScore)
                                    text.setAttribute('valveKind', res.valveKind)
                                    switch (res.valvePreScore) {
                                        case '1':
                                            text.style.backgroundColor = 'rgba(76, 184, 29, .4)'
                                            break
                                        case '2':
                                            text.style.backgroundColor = 'rgba(242, 242, 2, .4)'
                                            break
                                        case '3':
                                            text.style.backgroundColor = 'rgba(255, 102, 0, .4)'
                                            break
                                        case '4':
                                            text.style.backgroundColor = 'rgba(252, 21, 0, .4)'
                                            break
                                        case '5':
                                            text.style.backgroundColor = 'rgba(255, 0, 0, .4)'
                                            break
                                        default:
                                            text.style.backgroundColor = "transparent"
                                            break
                                    }
                                    switch (res.valveKind) {
                                        case 'CONTROL VALVE':
                                            text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/C_square.png")'
                                            text.style.backgroundRepeat = 'no-repeat'
                                            text.style.backgroundSize = '25px 25px'
                                            text.style.backgroundPosition = '-3px -2px'
                                            text.style.padding = "0 3px 0 24px"
                                            break
                                        case 'HAND VALVE':
                                            text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/H_square.png")'
                                            text.style.backgroundRepeat = 'no-repeat'
                                            text.style.backgroundSize = '25px 25px'
                                            text.style.backgroundPosition = '-3px -2px'
                                            text.style.padding = "0 3px 0 24px"
                                            break
                                        case 'SAFETY VALVE':
                                            text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/S_square.png")'
                                            text.style.backgroundRepeat = 'no-repeat'
                                            text.style.backgroundSize = '25px 25px'
                                            text.style.backgroundPosition = '-3px -2px'
                                            text.style.padding = "0 3px 0 24px"
                                            break
                                        default:
                                            text.style.backgroundColor = "transparent"
                                            text.style.padding = "0 3px"
                                            break
                                    }
                                    // if (text.getAttribute('pidId')) {
                                    //     _this.updateValue(text)
                                    // }
                                    // else {
                                    //     _this.insertValue(text)
                                    // }
                                }
                            })
                        }
                    }
                    // 自动获取焦点
                    setTimeout(() => {
                        text.focus()
                    }, 5)
                    content.appendChild(text)
                    _this.textArray.set(text.getAttribute('id'), text.value)
                }
            }
            let mousemove = (e) => {
                // document.getElementById(sx + '_' + sy).focus()
            }
            let mouseup = (e) => {
            }
            if (_this.pointType === 'text') {
                content.onmousedown = (e) => mousedown(e)
                content.onmousemove = (e) => mousemove(e)
                content.onmouseup = (e) => mouseup(e)
            }
        },

        // 以1920*1080为标准转换位置
        getLocation(id) {
            let position = id.split('_')
            let sx = null, sy = null;
            let canvasWidth = document.getElementById("ctx_front").offsetWidth
            let canvasHeight = document.getElementById("ctx_front").offsetHeight
            if (canvasWidth !== 1920) {
                // 计算缩放比例
                let difference = 1920 - canvasWidth
                let scale = (difference / canvasWidth) + 1
                sx = Number(position[0]) * scale
            }
            else {
                sx = Number(position[0])
            }
            if (canvasHeight !== 1080) {
                // 计算缩放比例
                let difference = 1080 - canvasHeight
                let scale = (difference / canvasHeight) + 1
                sy = Number(position[1]) * scale
            }
            else {
                sy = Number(position[1])
            }
            return sx + '_' + sy
        },

        // 初始化输入框
        initText(sx, sy, item) {
            let _this = this;
            let content = document.getElementById("content");
            let label = document.getElementById("label");
            // 初始化输入框
            let text = document.createElement('input')
            text.setAttribute('type', "text")
            text.setAttribute('id', sx + '_' + sy)
            text.setAttribute('pidId', item.id)
            text.setAttribute('tagId', item.tagId)
            text.setAttribute('tagNumber', item.pvalue)
            text.setAttribute('valveId', item.valveId)
            text.setAttribute('valvePreScore', item.valvePreScore)
            text.setAttribute('inputType', 'pdfInput')
            text.setAttribute('valveKind', item.valveKind)
            // 定位到鼠标点击位置
            // this.ctx_front.moveTo(sx, sy)
            text.value = item.pvalue
            label.innerHTML = item.pvalue
            text.style.width = label.offsetWidth + 'px'
            // text.style.border = "none"
            switch (item.valvePreScore) {
                case '1':
                    text.style.backgroundColor = 'rgba(76, 184, 29, .4)'
                    break
                case '2':
                    text.style.backgroundColor = 'rgba(242, 242, 2, .4)'
                    break
                case '3':
                    text.style.backgroundColor = 'rgba(255, 102, 0, .4)'
                    break
                case '4':
                    text.style.backgroundColor = 'rgba(252, 21, 0, .4)'
                    break
                case '5':
                    text.style.backgroundColor = 'rgba(255, 0, 0, .4)'
                    break
                default:
                    text.style.backgroundColor = "transparent"
                    break
            }
            text.style.fontSize = '14px';
            text.style.lineHeight = '20px';
            text.style.height = '20px';
            text.style.color = "#000";
            text.style.left = sx + 'px'
            text.style.top = sy + 'px'
            text.style.padding = "0 3px"
            text.style.display = "block";
            text.style.position = "absolute";
            text.style.zIndex = '99'
            switch (item.valveKind) {
                case 'CONTROL VALVE':
                    text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/C_square.png")'
                    text.style.backgroundRepeat = 'no-repeat'
                    text.style.backgroundSize = '25px 25px'
                    text.style.backgroundPosition = '-3px -2px'
                    text.style.padding = "0 3px 0 24px"
                    break
                case 'HAND VALVE':
                    text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/H_square.png")'
                    text.style.backgroundRepeat = 'no-repeat'
                    text.style.backgroundSize = '25px 25px'
                    text.style.backgroundPosition = '-3px -2px'
                    text.style.padding = "0 3px 0 24px"
                    break
                case 'SAFETY VALVE':
                    text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/S_square.png")'
                    text.style.backgroundRepeat = 'no-repeat'
                    text.style.backgroundSize = '25px 25px'
                    text.style.backgroundPosition = '-3px -2px'
                    text.style.padding = "0 3px 0 24px"
                    break
                default:
                    text.style.backgroundColor = "transparent"
                    text.style.padding = "0 3px"
                    break
            }
            // 实时监控输入框中的值
            text.addEventListener('input', function () {
                label.innerHTML = text.value
                text.style.width = label.offsetWidth + 'px'
                text.title = text.value
                _this.textArray.set(text.getAttribute('id'), text.value)
            }, false)
            text.onclick = function () {

            }
            text.onblur = function () {
                // 去掉输入值中的前后空格
                text.value = text.value.replace(/(^\s*)|(\s*$)/g, "")
                // 若为空  则删除节点
                if (text.value === '' || text.value === null) {
                    if (text.getAttribute('pidId') && _this.delArray.indexOf(text.getAttribute('pidId')) === -1) {
                        _this.delArray.push(text.getAttribute('pidId'))
                    }
                    // 判断位号列表是否存在  存在取消选择
                    if (text.getAttribute('tagNumber')) {
                        _this.cancelChecked(text.getAttribute('tagNumber'))
                    }
                    text.remove()
                    _this.textArray.delete(text.getAttribute('id'))
                }
                else {
                    _this.textArray.set(text.getAttribute('id'), text.value)
                    // 检测位号是否存在
                    listApi.searchTagNumber({tagNumber: text.value}, res => {
                        if (res.tagExist === false) {
                            Message({
                                type: 'warning',
                                message: '该阀门位号不存在',
                                showClose: true,
                                duration: 2000
                            });
                            // 判断位号列表是否存在  存在取消选择
                            if (text.getAttribute('tagNumber')) {
                                _this.cancelChecked(text.getAttribute('tagNumber'))
                            }
                            text.setAttribute('tagId', '')
                            text.setAttribute('valveId', '')
                            text.setAttribute('score', '')
                            text.setAttribute('valveKind', '')
                            text.style.backgroundColor = "transparent"
                            text.style.backgroundImage = ''
                            text.style.padding = "0 3px"
                        }
                        else {
                            let tagNumber = text.getAttribute('tagNumber')
                            if (tagNumber) {
                                if (tagNumber !== text.value) {
                                    _this.cancelChecked(tagNumber)
                                    _this.setChecked(text.value)
                                }
                            }
                            else {
                                _this.setChecked(text.value)
                            }
                            text.setAttribute('tagNumber', text.value)
                            text.setAttribute('tagId', res.tagId)
                            text.setAttribute('valveId', res.valveId)
                            text.setAttribute('score', res.valvePreScore)
                            text.setAttribute('valveKind', res.valveKind)
                            switch (res.valvePreScore) {
                                case '1':
                                    text.style.backgroundColor = 'rgba(76, 184, 29, .4)'
                                    break
                                case '2':
                                    text.style.backgroundColor = 'rgba(242, 242, 2, .4)'
                                    break
                                case '3':
                                    text.style.backgroundColor = 'rgba(255, 102, 0, .4)'
                                    break
                                case '4':
                                    text.style.backgroundColor = 'rgba(252, 21, 0, .4)'
                                    break
                                case '5':
                                    text.style.backgroundColor = 'rgba(255, 0, 0, .4)'
                                    break
                                default:
                                    text.style.backgroundColor = "transparent"
                                    break
                            }
                            switch (res.valveKind) {
                                case 'CONTROL VALVE':
                                    text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/C_square.png")'
                                    text.style.backgroundRepeat = 'no-repeat'
                                    text.style.backgroundSize = '25px 25px'
                                    text.style.backgroundPosition = '-3px -2px'
                                    text.style.padding = "0 3px 0 24px"
                                    break
                                case 'HAND VALVE':
                                    text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/H_square.png")'
                                    text.style.backgroundRepeat = 'no-repeat'
                                    text.style.backgroundSize = '25px 25px'
                                    text.style.backgroundPosition = '-3px -2px'
                                    text.style.padding = "0 3px 0 24px"
                                    break
                                case 'SAFETY VALVE':
                                    text.style.backgroundImage = 'url("../../../../static/project/images/editPDF/S_square.png")'
                                    text.style.backgroundRepeat = 'no-repeat'
                                    text.style.backgroundSize = '25px 25px'
                                    text.style.backgroundPosition = '-3px -2px'
                                    text.style.padding = "0 3px 0 24px"
                                    break
                                    break
                                default:
                                    text.style.backgroundColor = "transparent"
                                    text.style.padding = "0 3px"
                                    break
                            }
                            // if (text.getAttribute('pidId')) {
                            //     _this.updateValue(text)
                            // }
                            // else {
                            //     _this.insertValue(text)
                            // }
                        }
                    })
                }
            }
            // 判断文本类型
            if (this.pointType === 'default') {
                text.readOnly = true
                text.style.cursor = "default"
                text.onclick = function () {
                    if (text.getAttribute('valveId') !== 'null') {
                        let routeData = _this.$router.resolve({
                            name: 'valve_list',
                            params: {
                                valveId: text.getAttribute('valveId'),
                                tagId: text.getAttribute('tagId'),
                                tagNumber: text.value
                            },
                            query: {
                                valveId: text.getAttribute('valveId'),
                                tagId: text.getAttribute('tagId'),
                                tagNumber: text.value
                            }
                        })
                        window.open(routeData.href, '_blank');
                    }
                    else {
                        Message({
                            type: 'warning',
                            message: '此位号暂无阀门信息',
                            showClose: true,
                            duration: 2000
                        })
                    }
                }
            }
            content.appendChild(text)
        },

        // 转换位置
        async changeLocation(list) {
            let scaleW = null, scaleH = null;
            let canvasWidth = document.getElementById("ctx_front").offsetWidth;
            let canvasHeight = document.getElementById("ctx_front").offsetHeight;
            if (canvasWidth !== 1920) {
                let diffrence = canvasWidth - 1920
                scaleW = (diffrence / 1920) + 1
            }
            else {
                scaleW = 1;
            }
            if (canvasHeight !== 1080) {
                let diffrence = canvasHeight - 1080
                scaleH = (diffrence / 1080) + 1
            }
            else {
                scaleH = 1;
            }
            await list.forEach(item => {
                let postion = item.location.split('_')
                let id = Number(postion[0]) * scaleW + '_' + Number(postion[1]) * scaleH
                this.textArray.set(id, item.pvalue)
                this.idArray.set(id, item.fileId)
                this.initText(Number(postion[0]), Number(postion[1]), item)
            })

        },

        // 删除
        deteleValue(text) {
            let _this = this;
            // 判断有无id
            if (text.getAttribute('pidId')) {
                let data = {
                    pidId: text.getAttribute('pidId')
                }
                pdfFile.deletePidFile(data, res => {
                    text.remove()
                    _this.textArray.delete(text.getAttribute('id'))
                })
            }
            else {
                text.remove()
            }
        },

        // 修改值
        updateValue(text) {
            let _this = this;
            let data = {
                id: text.getAttribute('pidId'),
                location: text.getAttribute('id'),
                pvalue: text.value,
                fileId: this.$parent.currentTreeId,
            }
            pdfFile.updatePidFile(data, res => {

            })
        },

        // 插入值
        insertValue(text) {
            // let location = this.getLocation(text.getAttribute('id'))
            let location = text.getAttribute('id')
            let _this = this
            let data = {
                fileId: this.$parent.currentTreeId,
                location: location,
                pvalue: text.value
            }
            pdfFile.insertPidFile(data, res => {
                text.setAttribute('pidId', res)
                _this.idArray.set(text.getAttribute('p'), res)
            }, error => {
                Message({
                    message: error.message,
                    type: "error",
                    duration: 2 * 1000
                })
                // 重新获取焦点
                setTimeout(() => {
                    text.focus()
                }, 5)
            })
        },
        // 获取详情
        getDetail(id) {
            let data = {
                pidId: id
            }
            let _this = this
            _this.textArray = new Map()
            _this.idArray = new Map()
            pdfFile.selectPidFile(data, res => {
                // 获取位号列表
                _this.getPdfTagNumber()
                let url = pdf.createLoadingTask({
                    url: Vue.prototype.FILE_SERVER_URL + res.path
                });
                // 获取图层
                pdfFile.selectPicInfo({fileId: id}, res => {
                    _this.url = url
                    // 图层
                    _this.currentImage = res
                }, error => {
                    Message({
                        type: 'error',
                        message: '图层加载失败，请重试',
                        showClose: true,
                        duration: 2000
                    })
                })
                if (res.pidFileList.length > 0) {
                    // this.changeLocation(res.pidFileList)
                    res.pidFileList.forEach(item => {
                        let postion = item.location.split('_')
                        let id = Number(postion[0]) + '_' + Number(postion[1])
                        _this.textArray.set(id, item.pvalue)
                        _this.idArray.set(id, item.fileId)
                        _this.initText(Number(postion[0]), Number(postion[1]), item)
                        // this.initText(Number(postion[0]) * scaleW, Number(postion[1]) * scaleH, item, scaleW, scaleH)
                    })
                }
            })
        },
        // 获取pdf相关位号
        getPdfTagNumber() {
             // 获取目前选择的节点
            let node = this.$parent.$refs.getPdfTree.getCurrentNode()
            let data = {
                fileName: node.nodeName,
                type: node.nodeVal
            }
            let _this = this
            _this.tagList = []
            _this.defaultChecked = [];
            _this.checkControl = []
            _this.checkHand = []
            _this.checkSafe = []
            _this.check = []
            _this.notCheckControl = []
            _this.notCheckHand = []
            _this.notCheckSafe = []
            _this.notCheck = [];
            pdfFile.selectTagNumberByPdfFileName(data, res => {
                const arrangeList = function () {
                    // 处理异步
                    return new Promise(function (resolve, reject) {
                        res.forEach((item, index) => {
                            res[index].disabled = item.markFlag === '0'
                            if (item.markFlag === '1') {
                                _this.defaultChecked.push(item.tagNumber)
                                switch (item.valveKind) {
                                    case 'CONTROL VALVE':
                                        _this.checkControl.push(item)
                                        break
                                    case 'HAND VALVE':
                                        _this.checkHand.push(item)
                                        break
                                    case 'SAFETY VALVE':
                                        _this.checkSafe.push(item)
                                        break
                                    default:
                                        _this.check.push(item)
                                        break
                                }
                            }
                            else {
                                switch (item.valveKind) {
                                    case 'CONTROL VALVE':
                                        _this.notCheckControl.push(item)
                                        break
                                    case 'HAND VALVE':
                                        _this.notCheckHand.push(item)
                                        break
                                    case 'SAFETY VALVE':
                                        _this.notCheckSafe.push(item)
                                        break
                                    default:
                                        _this.notCheck.push(item)
                                        break
                                }
                            }
                        })
                        resolve(_this.checkControl, _this.checkHand, _this.checkSafe, _this.check, _this.notCheckControl, _this.notCheckHand, _this.notCheckSafe, _this.notCheck)
                    })
                }
                arrangeList().then(() => {
                    _this.tagList = this.checkControl.concat(this.checkHand, this.checkSafe, this.check, this.notCheckControl, this.notCheckHand, this.notCheckSafe, this.notCheck)
                })
            }, error => {
                Message({
                    type: 'error',
                    message: '获取位号列表失败，请重试！',
                    showClose: true,
                    duration: 2000
                })
            })
        },

        // 按照控制阀 手动阀  安全阀顺序整理列表
        async arrange(list) {
            let checkControl = [],
                checkHand = [],
                checkSafe = []
            await list.forEach(item => {
                switch (item.valveKind) {
                    case 'CONTROL VALVE':
                        checkControl.push(item)
                        break
                    case 'HAND VALVE':
                        checkHand.push(item)
                        break
                    case 'SAFETY VALVE':
                        checkSafe.push(item)
                        break
                    default:
                        break
                }
            })
            return checkControl.concat(checkHand, checkSafe)
        },
        // 选中事件
        checkedNodes(checkedNodes) {
            let inputs = []
            document.querySelectorAll('input').forEach(item => {
                if (item.getAttribute('inputType')) {
                    inputs.push(item)
                }
            })

            // 被点击的节点不为已选中状态
            if (this.$refs.tagNumberTree.getCheckedKeys().indexOf(checkedNodes.tagNumber) === -1) {
                inputs.forEach(item => {
                    if (item.value === checkedNodes.tagNumber) {
                        item.style.visibility = 'hidden'
                    }
                })
                this.allCheck = false
            }
            // 被选中状态  可见
            else {
                inputs.forEach(item => {
                    if (item.value === checkedNodes.tagNumber) {
                        item.style.visibility = 'visible'
                    }
                })
            }
            // 判断是否为全选状态
            let checked = this.$refs.tagNumberTree.getCheckedKeys()
            let checkList = this.checkControl.concat(this.checkHand, this.checkSafe, this.check)
            this.allCheck = checked.length >= checkList.length;
        },

        // 切换全选/全不选
        changeCheck(type){
            let checked = []
            let checkList = this.checkControl.concat(this.checkHand, this.checkSafe, this.check)
            // 获取输入框
            let inputs = []
            document.querySelectorAll('input').forEach(item => {
                if (item.getAttribute('inputType')) {
                    inputs.push(item)
                }
            })
            // 全选
            if(type){
                checkList.forEach(item => {
                    checked.push(item.tagNumber)
                })
                // 所有输入框可见
                inputs.forEach(item => {
                    item.style.visibility = 'visible'
                })
                this.$refs.tagNumberTree.setCheckedKeys(checked, true)
            }
            else{
                let arr = []
                // 将位号合并成一个数组
                checkList.forEach(item=>{
                    arr.push(item.tagNumber)
                })
                // 便利位号列表中存在的位号  隐藏
                inputs.forEach(item => {
                    if(arr.indexOf(item.value) !== -1){
                        item.style.visibility = 'hidden'
                    }
                })
                this.$refs.tagNumberTree.setCheckedKeys(checked, true)
            }


            this.allCheck = !this.allCheck
        },

        // 选中
        setChecked(tagNumber) {
            let list = JSON.parse(JSON.stringify(this.tagList))
            let _this = this
            // 判断位号列表有无该元素
            list.forEach((item, index) => {
                // 存在
                if (item.tagNumber === tagNumber) {
                    item.disabled = false
                    let len = this.checkControl.length + this.checkHand.length + this.checkSafe.length + this.check.length
                    switch (item.valveKind) {
                        case 'CONTROL VALVE':
                            this.checkControl.push(item)
                            this.notCheckControl.splice(index - len, 1)
                            break
                        case 'HAND VALVE':
                            this.checkHand.push(item)
                            this.notCheckHand.splice(index - len - this.notCheckControl.length, 1)
                            break
                        case 'SAFETY VALVE':
                            this.checkSafe.push(item)
                            this.notCheckSafe.splice(index - len - this.notCheckControl.length - this.notCheckHand.length, 1)
                            break
                        default:
                            this.check.push(item)
                            this.notCheck.splice(index - len - this.notCheckControl.length - this.notCheckHand.length - this.notCheckSafe.length, 1)
                            break
                    }
                    const removeData = function () {
                        return new Promise(function (resolve, reject) {
                            let tempData = JSON.parse(JSON.stringify(_this.tagList))
                            _this.tagList.splice(0, _this.tagList.length)
                            tempData.forEach(v => {
                                let node = _this.$refs.tagNumberTree.getNode(v)
                                _this.$refs.tagNumberTree.remove(node)  //移除node
                            })
                            _this.$set(_this.$refs.tagNumberTree.store, "nodesMap", [])
                            resolve(_this.tagList)
                        })
                    }
                    removeData().then(() => {
                        this.tagList = this.checkControl.concat(this.checkHand, this.checkSafe, this.check, this.notCheckControl, this.notCheckHand, this.notCheckSafe, this.notCheck)
                        // 遍历已选中状态的字段
                        this.defaultChecked.push(item.tagNumber)
                    })
                }
            })
        },

        // 取消选中
        cancelChecked(tagNumber) {
            this.tagList.forEach((item1, index1) => {
                if (item1.tagNumber === tagNumber) {
                    item1.disabled = true
                    switch (item1.valveKind) {
                        case 'CONTROL VALVE':
                            this.notCheckControl.push(item1)
                            this.checkControl.splice(index1, 1)
                            break
                        case 'HAND VALVE':
                            this.notCheckHand.push(item1)
                            this.checkHand.splice(index1 - this.checkControl.length, 1)
                            break
                        case 'SAFETY VALVE':
                            this.notCheckSafe.push(item1)
                            this.checkSafe.splice(index1 - this.checkControl.length - this.checkHand.length, 1)
                            break
                        default:
                            this.check.push(item1)
                            this.notCheck.splice(index1 - this.checkControl.length - this.checkHand.length - this.checkSafe.length, 1)
                            break
                    }
                    this.tagList = this.checkControl.concat(this.checkHand, this.checkSafe, this.check, this.notCheckControl, this.notCheckHand, this.notCheckSafe, this.notCheck)
                    // 遍历已选中状态的字段
                    this.defaultChecked.forEach((item, index) => {
                        if (item === tagNumber) {
                            this.defaultChecked.splice(index, 1)
                            this.$refs.tagNumberTree.setCheckedKeys(this.defaultChecked, true)
                        }
                    })
                }
            })
        },

        // 新增位号后调用函数
        addTagNumberNode(valveKind, tagNumber){
            let data = {
                markFlag: "0",
                tagNumber: tagNumber,
                valveKind: valveKind,
                disabled: true
            }
            switch (valveKind){
                case 'CONTROL VALVE':
                    this.notCheckControl.push(data)
                    break
                case 'HAND VALVE':
                    this.notCheckHand.push(data)
                    break
                case 'SAFETY VALVE':
                    this.notCheckSafe.push(data)
                    break
                default:
                    this.notCheck.push(data)
                    break
            }
            this.tagList = this.checkControl.concat(this.checkHand, this.checkSafe, this.check, this.notCheckControl, this.notCheckHand, this.notCheckSafe, this.notCheck)
        },
    },
}
