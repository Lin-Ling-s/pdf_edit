<template>
    <div id="main" class="hello">
        <div id="test" style="width: auto; height: auto; position: absolute;top: 0;left: 0;right: 0;bottom: 0;">
            <div id="hidden" style="height: 80px; position: absolute;top: 0;left: 0;right: 0">
                <div id="first" style="height: 40px;position: absolute;top: 0;left: 0;right: 0;">
                    <el-button class="drag" @click="drag">拖拽</el-button>
                    <el-button class="default" v-if="pointType === 'default'" @click="editClick">切换到编辑模式</el-button>
                    <el-button class="default" v-else @click="defaultClick">切换到浏览模式</el-button>
                    <el-button class="export" @click="exportPdf">导出</el-button>
                    <el-upload
                        :http-request="httpRequest"
                        :multiple="false"
                        :on-change="handleChange"
                        :show-file-list="false"
                        accept=".pdf,.PDF"
                        action="">
                        <el-button class="refreshPdf">更新pdf</el-button>
                    </el-upload>
                </div>
                <div id="second" v-if="pointType !== 'default'" style="height: 40px;position: absolute;top: 40px;left: 0;right: 0;">
                    <el-button class="textBtn" @click="textClick">位号标注</el-button>
                    <el-button class="arrowBtn" @click="arrowClick">绘制箭头</el-button>
                    <el-button class="boxBtn" @click="boxClick">绘制方框</el-button>
                    <el-button class="eraserBtn" @click="eraserClick">橡皮擦</el-button>
                    <label class="sliderLabel">橡皮擦粗细：</label>
                    <el-slider id="slider" ref="slider" v-model="slider" :max="30" :min="1" :step="1"></el-slider>
                    <el-button class="savePdf add" @click="savePdf">保存编辑</el-button>
                </div>
<!--                <label class="sliderLabel">橡皮粗细：</label>-->
<!--                <el-slider id="slider" ref="slider" v-model="slider" :max="30" :min="1" :step="1"></el-slider>-->
<!--                <el-button class="arrowBtn" @click="arrowClick">箭头</el-button>-->
<!--                <el-button class="boxBtn" @click="boxClick">方框</el-button>-->
<!--                <el-button class="eraserBtn" @click="eraserClick">橡皮</el-button>-->
<!--                <el-button class="textBtn" @click="textClick">文本框</el-button>-->

<!--                <el-button class="refreshPdf" @click="refreshPdf">更新pdf</el-button>-->
<!--                <el-button class="savePdf" @click="savePdf">保存</el-button>-->
            </div>
            <div id="test1" ref="test1">
                <div class="pdfLeft">
                    <div id="content" :style="'cursor:' + cursor" style="height: auto; width: auto; position: relative">
                        <pdf id="pdf" ref="pdf" :src="url"></pdf>
                        <canvas id="ctx_back" ref="ctx_back" :style="'cursor:' + cursor"></canvas>
                        <canvas id="ctx_front" ref="ctx_front" :style="'cursor:' + cursor"></canvas>
                        <label id="label" class="label"></label>
                    </div>
                </div>
                <div :style="{width:pdfTreeWidth+'px'}" class="pdfTree">
                    <div class="stretch" @click="changeTreeWidth">
                        <i :class="pdfTreeWidth===0 ? 'el-icon-arrow-left' : 'el-icon-arrow-right'"></i>
                    </div>
                    <div class="allCheck" v-if="!allCheck" @click="changeCheck(true)">全选</div>
                    <div class="allCheck" v-else @click="changeCheck(false)">全不选</div>
                    <el-button class="addNewTagNumber" v-if="pdfTreeWidth!==0" @click="addNewTagNumber">新增位号</el-button>
                    <el-tree
                        :current-node-key="currentTreeId"
                        class="filter-tree"
                        v-show="pdfTreeWidth!==0"
                        :data="tagList"
                        :props="defaultProps"
                        show-checkbox
                        @check="checkedNodes"
                        :check-on-click-node="true"
                        :default-checked-keys="defaultChecked"
                        ref="tagNumberTree"
                        node-key="tagNumber"
                        highlight-current
                        expand-on-click-node>
                        <template class="custom-tree-node"  slot-scope="{ node, data }">
                            <div :title="data.tagNumber" style="line-height: 26px">
                                <span v-if="data.valveKind==='CONTROL VALVE'" class="control" style="padding-left: 18px">{{node.label}}</span>
                                <span v-else-if="data.valveKind==='HAND VALVE'" class="hand" style="padding-left: 18px">{{node.label}}</span>
                                <span v-else-if="data.valveKind==='SAFETY VALVE'" class="hand" style="padding-left: 18px">{{node.label}}</span>
                                <span v-else>{{node.label}}</span>
                            </div>
                        </template>
                    </el-tree>
                </div>
            </div>
        </div>
        <addNewTagNumber ref="addNewTagNumber"></addNewTagNumber>
    </div>
</template>

<script>
import index from './index.js'

export default index
</script>

<style scoped>
@import url("./index.css");
</style>
