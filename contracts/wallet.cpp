#include "wallet.hpp"

void wallet::init(account_name executor, extended_symbol token)
{
    // The contract's permission shall be changed to eosio.code
    // after calling init to remove any risk of being hacked.
    require_auth(_self);

    // The executor must exist
    eosio_assert(is_account(executor), "The executor account must exist");

    // The token must exist
    eosio_assert(is_account(token.contract), "The token contract must exist");
    tbl_currency_stats currency(token.contract, token.value >> 8);
    eosio_assert(currency.begin() != currency.end(), "The token does not exist");

    // The contract must have not been inited
    tbl_configs configs(_self, _self);
    eosio_assert(!configs.exists(), "The contract has already been initialized");

    //  Writes the configs
    config new_config{
        .executor = executor,
        .token = token};
    configs.set(new_config, _self);
}

void wallet::newdept(string name, permission_name permission)
{
    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, PERMISSION_ADD_DEPARTMENT);

    // Finds next department id
    tbl_departments departments(_self, _self);
    auto last_department = departments.rbegin();
    uint64_t next_dept_id = last_department == departments.rend() ? 1 : last_department->id + 1;

    // Creates the department
    departments.emplace(_self, [&](department &new_department) {
        new_department.id = next_dept_id;
        new_department.name = name;
        new_department.permission = permission;
    });
}

void wallet::toggledept(uint64_t id, bool enabled)
{
    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, PERMISSION_TOGGLE_DEPARTMENT);

    // Gets the department
    tbl_departments departments(_self, _self);
    auto target_department = departments.find(id);
    eosio_assert(target_department != departments.end(), "The department does not exist");

    // The status must be changed
    eosio_assert(target_department->enabled != enabled, "The department status is not being changed");

    // Changes the status
    departments.modify(target_department, _self, [&](department &modified_department) {
        modified_department.enabled = enabled;
    });
}

void wallet::setdeptlmt(uint64_t id, uint64_t new_allowance)
{
    // Gets the department
    tbl_departments departments(_self, _self);
    auto department = departments.find(id);
    eosio_assert(department != departments.end(), "The department does not exist");

    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, department->permission);

    // Checks if a pending application for this department exists
    //
    // Using iterations here for easier front-end queries (demo purpose)
    // (Possible optimization: use scope and PK for fast retrival)
    //
    tbl_applications applications(_self, _self);
    for (auto it = applications.begin(); it != applications.end(); it++)
        eosio_assert(it->department_id != id || it->status != APPLICATION_STATUS_PENDING, "A pending application for this department already exists");

    // Finds next application id
    auto last_application = applications.rbegin();
    uint64_t next_application_id = last_application == applications.rend() ? 1 : last_application->application_id + 1;

    // The allowance must be changed
    eosio_assert(department->monthly_allowance != new_allowance, "Allowance is not being changed");

    // Creates the application
    applications.emplace(_self, [&](application &new_application) {
        new_application.application_id = next_application_id;
        new_application.department_id = id;
        new_application.from_allowance = department->monthly_allowance;
        new_application.to_allowance = new_allowance;
        new_application.status = APPLICATION_STATUS_PENDING;
    });
}

void wallet::processapp(uint64_t id, bool approve)
{
    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, PERMISSION_PROCESS_APPLICATION);

    // Gets application
    tbl_applications applications(_self, _self);
    auto application = applications.find(id);
    eosio_assert(application != applications.end(), "Application does not exist");
    eosio_assert(application->status == APPLICATION_STATUS_PENDING, "Application has already been processed");

    // Changes application status
    applications.modify(application, _self, [&](::application &modified_application) {
        modified_application.status = approve ? APPLICATION_STATUS_APPROVED : APPLICATION_STATUS_REJECTED;
    });

    // Nothing to do if rejected
    if (!approve)
        return;

    // Changes the allowance
    tbl_departments departments(_self, _self);
    auto department = departments.find(application->department_id);
    departments.modify(department, _self, [&](::department &modified_department) {
        modified_department.monthly_allowance = application->to_allowance;
    });
}

void wallet::addexpense(uint64_t department_id, string name, account_name recipient, uint64_t monthly_allowance)
{
    // Gets the department
    tbl_departments departments(_self, _self);
    auto department = departments.find(department_id);
    eosio_assert(department != departments.end(), "The department does not exist");

    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, department->permission);

    // Recipient must exist
    eosio_assert(is_account(recipient), "The recipient account does not exist");

    // Checks allowance allocation
    uint64_t new_allowance_allocated = department->allowance_allocated + monthly_allowance;
    eosio_assert(new_allowance_allocated > department->allowance_allocated, "Allowance overflow");
    eosio_assert(new_allowance_allocated <= department->monthly_allowance, "Allowance overdrawn");

    // Finds next expenditure id
    tbl_expenditures expenditures(_self, department_id);
    auto last_expenditure = expenditures.rbegin();
    uint64_t next_expenditure_id = last_expenditure == expenditures.rend() ? 1 : last_expenditure->id + 1;

    // Adds the expenditure
    expenditures.emplace(_self, [&](expenditure &new_expenditure) {
        new_expenditure.id = next_expenditure_id;
        new_expenditure.name = name;
        new_expenditure.recipient = recipient;
        new_expenditure.monthly_allowance = monthly_allowance;
    });

    // Modifies the department allowance allocation
    departments.modify(department, _self, [&](::department &modified_department) {
        modified_department.allowance_allocated = new_allowance_allocated;
    });
}

void wallet::rmexpense(uint64_t department_id, uint64_t expenditure_id)
{
    // Gets the department
    tbl_departments departments(_self, _self);
    auto department = departments.find(department_id);
    eosio_assert(department != departments.end(), "The department does not exist");

    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, department->permission);

    // Gets the expenditure
    tbl_expenditures expenditures(_self, department_id);
    auto expenditure = expenditures.find(expenditure_id);
    eosio_assert(expenditure != expenditures.end(), "Expenditure does not exist");
    eosio_assert(!expenditure->removed, "Expenditure has already been removed");

    // Changes the expenditure removal flag
    expenditures.modify(expenditure, _self, [&](::expenditure &modified_expenditure) {
        modified_expenditure.removed = true;
    });

    // Changes the allowance allocated (no need to check underflow)
    departments.modify(department, _self, [&](::department &modified_department) {
        modified_department.allowance_allocated -= expenditure->monthly_allowance;
    });
}

void wallet::spend(uint64_t department_id, uint64_t expenditure_id, uint64_t amount, string memo)
{
    // Gets the department
    tbl_departments departments(_self, _self);
    auto department = departments.find(department_id);
    eosio_assert(department != departments.end(), "The department does not exist");

    // Checks auth
    auto configs = get_config();
    require_auth2(configs.executor, department->permission);

    // Gets expenditure
    tbl_expenditures expenditures(_self, department_id);
    auto expenditure = expenditures.find(expenditure_id);
    eosio_assert(expenditure != expenditures.end(), "Expenditure does not exist");

    // Department must not be disabled
    eosio_assert(department->enabled, "Department has been suspended");

    // Expenditure must not be removed
    eosio_assert(expenditure->removed, "Expenditure has been removed");

    // Checks allowance
    uint64_t new_used_expenditure_allownance = add_spend(expenditure->allowance_used, amount, expenditure->last_spend_time);
    uint64_t new_used_department_allowance = add_spend(department->allowance_used, amount, department->last_spend_time);
    // Expenditure level
    eosio_assert(new_used_expenditure_allownance <= expenditure->monthly_allowance, "Allowance overdrawn");
    // Department level
    eosio_assert(new_used_department_allowance <= department->monthly_allowance, "Allowance overdrawn");

    // Sends the token
    transfer_args token_transfer{
        .from = _self,
        .to = expenditure->recipient,
        .quantity = asset(amount, symbol_type(configs.token.value)),
        .memo = memo};
    action(permission_level{_self, N(active)}, configs.token.contract, N(transfer), token_transfer)
        .send();

    // Changes expenditure allowance used
    expenditures.modify(expenditure, _self, [&](::expenditure &modified_expenditure) {
        modified_expenditure.allowance_used = new_used_expenditure_allownance;
    });

    // Changes department allowance used
    departments.modify(department, _self, [&](::department &modified_department) {
        modified_department.allowance_used = new_used_department_allowance;
    });

    // Adds to expense history
    //
    // Note that this is just for DEMO PURPOSE so that eosjs can
    // easily pull out the entire history. For real production
    // an off-chain record-keeping system shall be used to save RAM.
    //
    tbl_expenses expenses(_self, _self);
    auto last_expense = expenses.rbegin();
    expenses.emplace(_self, [&](expense &new_expense) {
        new_expense.id = last_expense == expenses.rend() ? 1 : last_expense->id + 1;
        new_expense.department_id = department_id;
        new_expense.expenditure_id = expenditure_id;
        new_expense.time = now();
        new_expense.amount = amount;
        new_expense.memo = memo;
    });
}

uint64_t wallet::add_spend(uint64_t spend_before, uint64_t add_spend, uint32_t last_spend_time)
{
    time_t time_last = (long)last_spend_time;
    time_t time_now = (long)now();

    tm *tm_last = gmtime(&time_last);
    tm *tm_now = gmtime(&time_now);

    if (tm_last->tm_year == tm_now->tm_year && tm_last->tm_mon == tm_now->tm_mon)
    {
        // Same month
        uint64_t new_spend = spend_before + add_spend;
        eosio_assert(new_spend > spend_before, "Amount overflow");

        return new_spend;
    }
    else
    {
        // Different month
        return add_spend;
    }
}

config wallet::get_config()
{
    tbl_configs configs(_self, _self);
    eosio_assert(configs.exists(), "The contract has not been initialized");
    return configs.get();
}