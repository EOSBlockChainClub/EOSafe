import * as React from 'react'
import {inject, observer} from 'mobx-react'
import {observable, action} from 'mobx'
import {Form} from 'antd'
import {FormComponentProps} from 'antd/lib/form'

import {ComponentExt} from '@utils/reactExt'
import Column from "antd/lib/table/Column";
import Tag from "antd/lib/tag";

import Table from "antd/lib/table/Table";

const FormItem = Form.Item

const formItemLayout = {
    labelCol: {
        xs: {span: 24},
        sm: {span: 5}
    },
    wrapperCol: {
        xs: {span: 24},
        sm: {span: 19}
    }
}
//(time, txid, memo, cost)
const data = [{
    key: 1,
    time: '1999 1 1 1:11:11',
    txid: '0xdsklfdjsklafdfsklfdsjklfkldsfklds',
    memo: "spend for jxxx",
    tags: ['nice', 'developer'],
    cost: "100.0000 EOS",
}]


interface IStoreProps {
}

interface IProps extends IStoreProps {

}

@inject(
    (store: IStore): IStoreProps => {
        const {} = store.userStore
        return {}
    }
)
@observer
class ExpenseHistory extends ComponentExt<IProps & FormComponentProps> {
    @observable
    private loading: boolean = false

    @action
    toggleLoading = () => {
        this.loading = !this.loading
    }

    render() {
        const {form} = this.props
        const {getFieldDecorator} = form
        return (
            // (time, txid, memo, cost)
            <Table dataSource={data}>

                <Column
                    title="Time:"
                    dataIndex="time"
                    key="time"
                />
                <Column
                    title="Txid:"
                    dataIndex="txid"
                    key="txid"
                />

                <Column
                    title="Memo"
                    dataIndex="memo"
                    key="memo"
                />
                <Column
                    title="Cost"
                    dataIndex="cost"
                    key="cost"
                />
                <Column
                    title="Tags"
                    dataIndex="tags"
                    key="tags"
                    render={tags => (
                        <span>{tags.map(tag => <Tag color="blue" key={tag}>{tag}</Tag>)}</span>
                    )}
                />
            </Table>
        )
    }
}

export default Form.create<IProps>()(ExpenseHistory)
