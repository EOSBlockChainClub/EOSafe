import * as React from 'react'
import { observer } from 'mobx-react'
// import { observable, action } from 'mobx'

import * as styles from './index.scss'

@observer
class CfoPanel extends React.Component {
    // @observable
    // private tableScrollY: number = 0

    private containerRef: HTMLDivElement = null

    // @action
    setTableScrollY = () => {
        if (this.containerRef) {
            // this.tableScrollY = this.containerRef.clientHeight - 60
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
        return (
            <div className={styles.container}>

            </div>
        )
    }
}

export default CfoPanel
