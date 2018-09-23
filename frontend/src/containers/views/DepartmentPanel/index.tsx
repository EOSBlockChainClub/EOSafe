import * as React from 'react'
import {observer} from 'mobx-react'
import {action, observable} from 'mobx'

import * as styles from './index.scss'
import ExpenditureComponent from "@views/DepartmentPanel/ExpenditureComponent";
import RGL, {WidthProvider} from "react-grid-layout";
import {Card, Form} from "antd";
import FormItem from "antd/lib/form/FormItem";
import ApplyToChangeModal from "@views/DepartmentPanel/ApplyToChangeModal";

const ReactGridLayout = WidthProvider(RGL);

@observer
class DepartmentPanel extends React.Component {
    @observable
    private tableScrollY: number = 0

    private containerRef: HTMLDivElement = null

    @observable
    private applyToChangeModalVisible: boolean = false

    @action
    toggleApplyToChangeModalVisible = () => {
        this.applyToChangeModalVisible = !this.applyToChangeModalVisible
    }

    onClickApply = (e) => {
        e.preventDefault()
        this.toggleApplyToChangeModalVisible()
    }

    @action
    setTableScrollY = () => {
        if (this.containerRef) {
            this.tableScrollY = this.containerRef.clientHeight - 60
        }
    }

    setContainerRef = (ref: HTMLDivElement) => {
        this.containerRef = ref
        this.setTableScrollY()
    }

    bindOrUnbindResize = (type: 'bind' | 'unbind') => {
        const listener = type === 'bind' ? window.addEventListener : window.removeEventListener
        listener('resize', this.setTableScrollY, false)
    }

    componentDidMount() {
        this.bindOrUnbindResize('bind')
    }

    componentWillUnmount() {
        this.bindOrUnbindResize('unbind')
    }

    render() {
        const formItemLayout = {
            labelCol: { span: 6 },
            wrapperCol: { span: 14 },
        };

        return (
            <div className={styles.container}>
                <h3>Department Name: HR</h3>
                <div key='a' data-grid={{x: 0, y: 0, h: 3, w: 2}}>
                    {/*<Header/>*/}
                    <div className={styles.tableBox} ref={this.setTableScrollY}>
                        <ExpenditureComponent scrollY={this.tableScrollY}/>
                    </div>
                </div>
                <ApplyToChangeModal visible={this.applyToChangeModalVisible} onCancel={this.toggleApplyToChangeModalVisible} />
                <ReactGridLayout cols={2}>
                    <Card key='allowance' data-grid={{x: 0, y: 0, h: 2, w: 2}}
                    title="Allowance" extra={<a onClick={this.onClickApply} href="">Apply to Charge</a>}>

                        <Form>
                            <FormItem label="Monthly Allowance:"  {...formItemLayout}>
                                <span className="ant-form-text">1000.0000 EOS</span>
                            </FormItem>
                            <FormItem label="Allowance Used:"  {...formItemLayout}>
                                <span className="ant-form-text">800.0000 EOS</span>
                            </FormItem>
                        </Form>
                    </Card>

                    <Card key='expenditure' data-grid={{x: 0, y: 2, h: 1, w: 1}}
                                   title="expenditure"
                                   extra={<a href="#">Manage</a>}/>

                    <Card key='recent' data-grid={{x: 1, y: 2, h: 1, w: 1}}
                    title="Recent Expense"
                          extra={<a href="#">See All</a>}>

                    </Card>
                </ReactGridLayout>
                <img src={require('./WechatIMG193.jpeg')}/>
            </div>
        )
    }
}

export default DepartmentPanel
