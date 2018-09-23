import React, { Component } from 'react';
import { Card, Col, Row, Divider, Modal, Input } from 'antd';
import Eos from "eosjs";

import ExpenditureDisplay from "../../components/ExpenditureDisplay";

class Dashborad extends Component {

    constructor(props) {
        super(props);
        this.state = {
            changeAllowanceModal: false,
            departmentName: "-",
            monthlyAllowance: "-",
            allowanceUsed: "-",
            allowanceAllocated: "-",
            expenditures: null,
            expenses: null,
            tokenName: "XXX"
        };

        this.pageInit();
    }

    pageInit = async () => {
        const eos = Eos({
            httpEndpoint: "http://127.0.0.1:8888"
        });

        const configs = (await eos.getTableRows(true, "wallet", "wallet", "configs")).rows[0];
        const department = (await eos.getTableRows(true, "wallet", "wallet", "departments")).rows[0];
        const expenditures = (await eos.getTableRows(true, "wallet", department.id, "expenditures")).rows;
        const expenses = (await eos.getTableRows(true, "wallet", "wallet", "expenses")).rows;

        const token = this.parseToken(configs.token);

        const displayedExpenditures = new Array();
        const displayedExpenses = new Array();

        for (let i = 0; i < expenditures.length; i++) {

            const currentExpenditure = expenditures[i];
            if (currentExpenditure.removed)
                continue;

            displayedExpenditures.push({
                name: currentExpenditure.name,
                used: this.formatAmount(currentExpenditure.allowance_used, token),
                total: this.formatAmount(currentExpenditure.monthly_allowance, token),
                percent: Math.round(currentExpenditure.allowance_used / currentExpenditure.monthly_allowance * 100)
            });
        }

        for (let i = expenses.length - 1; i >= 0; i--) {

            const currentExpense = expenses[i];
            if (currentExpense.department_id != department.id)
                continue;

            displayedExpenses.push({
                time: currentExpense.time,
                amount: this.scaleAmount(currentExpense.amount, token.precision),
                memo: currentExpense.memo
            });
        }

        this.setState({
            departmentName: department.name,
            monthlyAllowance: this.scaleAmount(department.monthly_allowance, token.precision),
            allowanceUsed: this.scaleAmount(department.allowance_used, token.precision),
            allowanceAllocated: this.scaleAmount(department.allowance_allocated, token.precision),
            expenditures: displayedExpenditures,
            expenses: displayedExpenses,
            tokenName: token.name
        });
    }

    formatAmount = (amount, token) => {
        return this.scaleAmount(amount, token.precision) + " " + token.name;
    }

    scaleAmount = (amount, precision) => {
        return (amount / Math.pow(10, precision)).toFixed(precision);
    }

    parseToken = (token) => {

        let symbolName = "";

        let tokenValue = token.value;
        let tokenPrecision = tokenValue & 0xFF;
        tokenValue >>= 8;
        while (tokenValue > 0) {
            symbolName += String.fromCharCode(tokenValue & 0xFF);
            tokenValue >>= 8;
        }

        return { name: symbolName, precision: tokenPrecision };
    }

    showModal = () => {
        this.setState({
            changeAllowanceModal: true,
        });
    }

    handleOk = (e) => {
        console.log(e);
        this.setState({
            changeAllowanceModal: false,
        });
    }

    handleCancel = (e) => {
        console.log(e);
        this.setState({
            changeAllowanceModal: false,
        });
    }

    render() {
        return (
            <div>
                <h1>{this.state.departmentName} Department</h1>
                <Card
                    style={{ width: '100%' }}
                    title="Allowance"
                    extra={<a href="#" onClick={this.showModal}>Apply to Change</a>}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <p style={{ textAlign: "center" }}>Monthly Allowance:</p>
                        </Col>
                        <Col span={12}>
                            <p style={{ textAlign: "center" }}><strong>{this.state.monthlyAllowance} {this.state.tokenName}</strong></p>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <p style={{ textAlign: "center" }}>Allowance Used:</p>
                        </Col>
                        <Col span={12}>
                            <p style={{ textAlign: "center" }}><strong>{this.state.allowanceUsed} {this.state.tokenName}</strong></p>
                        </Col>
                    </Row>
                </Card>
                <br />
                <Row gutter={16}>
                    <Col span={12}>
                        <Card
                            style={{ width: '100%' }}
                            title="Expenditures"
                            extra={<a href="#">Manage</a>}
                            activeTabKey={this.state.key}
                            onTabChange={(key) => { this.onTabChange(key, 'key'); }}
                        >
                            {
                                this.state.expenditures ? <ExpenditureDisplay expenditures={this.state.expenditures} /> : null
                            }
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card
                            style={{ width: '100%' }}
                            title="Recent Expenses"
                            extra={<a href="#">See All</a>}
                            activeTabKey={this.state.key}
                            onTabChange={(key) => { this.onTabChange(key, 'key'); }}
                        >
                            {
                                this.state.expenses == null ? null :
                                    this.state.expenses.map((value, index) => <div>
                                        <Row gutter={16}>
                                            <Col span={8}>
                                                <p style={{ margin: 0, color: "grey" }}>2018-08-20 16:00:00</p>
                                            </Col>
                                            <Col span={8}>
                                                <p style={{ margin: 0 }}>{value.name}</p>
                                            </Col>
                                            <Col span={8}>
                                                <p style={{ margin: 0, fontWeight: "bold", textAlign: "right" }}>- {value.amount} {this.state.tokenName}</p>
                                            </Col>
                                        </Row>
                                        {index == this.state.expenses.length - 1 ? null : <Divider />}
                                    </div>)
                            }
                        </Card>
                    </Col>
                </Row>

                <Modal
                    title="Change Department Allowance"
                    visible={this.state.changeAllowanceModal}
                    okText="Submit"
                    onOk={this.handleOk}
                    onCancel={this.handleCancel}
                >
                    <Row gutter={16}>
                        <Col span={10} style={{ textAlign: "center" }}>
                            <p>Current Allowance:</p>
                        </Col>
                        <Col span={10} style={{ textAlign: "right" }}>
                            <p>{this.state.monthlyAllowance}</p>
                        </Col>
                        <Col span={4}>
                            <p>{this.state.tokenName}</p>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={10} style={{ textAlign: "center" }}>
                            <p>Allocated Allowance:</p>
                        </Col>
                        <Col span={10} style={{ textAlign: "right" }}>
                            <p>{this.state.allowanceAllocated}</p>
                        </Col>
                        <Col span={4}>
                            <p>{this.state.tokenName}</p>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={10} style={{ textAlign: "center" }}>
                            <p>Allowance Used:</p>
                        </Col>
                        <Col span={10} style={{ textAlign: "right" }}>
                            <p>{this.state.allowanceUsed}</p>
                        </Col>
                        <Col span={4}>
                            <p>{this.state.tokenName}</p>
                        </Col>
                    </Row>
                    <Row gutter={16} style={{ display: "flex", alignItems: "center" }}>
                        <Col span={10} style={{ textAlign: "center" }}>
                            <p style={{ margin: 0 }}>New Allowance:</p>
                        </Col>
                        <Col span={10} style={{ textAlign: "right" }}>
                            <Input placeholder="" />
                        </Col>
                        <Col span={4}>
                            <p style={{ margin: 0 }}>{this.state.tokenName}</p>
                        </Col>
                    </Row>
                </Modal>
            </div>
        );
    }
}

export default Dashborad;
