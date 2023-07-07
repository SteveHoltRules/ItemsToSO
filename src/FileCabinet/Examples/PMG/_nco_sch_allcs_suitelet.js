/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/task', 'N/runtime'], function (serverWidget, search, record, task, runtime) {

    function onRequest(context) {

        // Perform the search for vendor bills
        var vendorBillHeaderSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: [
                ['mainline', 'is', true],
                'AND',
                ['custbody_nco_sch_allocations', 'is', true],
                'AND',
                ['custbody_nco_rel_adv_ic_je', 'anyof', '@NONE@'],
                'AND',
                ['approvalstatus', 'anyof', '2'],
                'AND',
                ['subsidiary', 'is', 38],
                'AND',
                [
                    ['type', 'anyof', 'VendBill'],
                    'OR',
                    ['type', 'anyof', 'VendCred']
                ]
            ],
            columns: [
                'internalid',
                'tranid',
                'trandate',
                'type',
                'name',
                'entity',
                'account',
                'memo',
                'custbody_nco_vendor_category'
            ]
        });

        var searchResultHeader = vendorBillHeaderSearch.run().getRange({
            start: 0,
            end: 1000
        });

        if (!searchResultHeader || !searchResultHeader.length) {

            var submissionForm = serverWidget.createForm({
                title: 'There are no vendor bills to process.'
            });

            context.response.writePage(submissionForm);
            return;
        }

        var headerInfo = {};

        for (var i = 0; i < searchResultHeader.length; i++) {

            headerInfo[searchResultHeader[i].getValue({name: 'internalid'})] = {
                'entity': searchResultHeader[i].getText({name: 'entity'}),
                'type': searchResultHeader[i].getText({name: 'type'}),
            }
        }


        // Create the form
        var form = serverWidget.createForm({
            title: 'Schedule Allocations'
        });

        //Amortization Templates

        var amortizationTemplateField = form.addField({
            id: 'custpage_amortz_sch',
            type: serverWidget.FieldType.SELECT,
            label: 'Amortization Schedule',
        });

        var templateSearch = search.create({
            type: search.Type.AMORTIZATION_TEMPLATE,
            filters: [{
                name: 'isinactive',
                operator: 'is',
                values: ['F']
            }],
            columns: ['name', 'internalid']
        });

        amortizationTemplateField.addSelectOption({
            value: '0',
            text: ''
        });

        var templateSearchResult = templateSearch.run().getRange({
            start: 0,
            end: 1000
        });

        templateSearchResult.forEach(function (result) {
            var internalId = result.getValue({
                name: 'internalid'
            });

            var name = result.getValue({
                name: 'name'
            });

            amortizationTemplateField.addSelectOption({
                value: internalId,
                text: name
            });
        });

        //Allocation Schedule

        var allocationScheduleField = form.addField({
            id: 'custpage_allocation_sch',
            type: serverWidget.FieldType.SELECT,
            label: 'Allocation Schedule',
            source: 'customrecord_nco_alloc_sch'
        });

        allocationScheduleField.isMandatory = true;

        // Create the sublist


        var vendBillSublist = form.addSublist({
            id: 'custpage_vendorbill_sublist',
            type: serverWidget.SublistType.LIST,
            label: 'Vendor Bills and Credits'
        });

        vendBillSublist.addMarkAllButtons();

        vendBillSublist.addField({
            id: 'custpage_select',
            type: serverWidget.FieldType.CHECKBOX,
            label: 'Select'
        });

        var recIntId = vendBillSublist.addField({
            id: 'custpage_rec_int_id',
            type: serverWidget.FieldType.TEXT,
            label: 'Record Internal Id'
        });

        var lineId = vendBillSublist.addField({
            id: 'custpage_line_id',
            type: serverWidget.FieldType.TEXT,
            label: 'Line Id'
        });

        recIntId.updateDisplayType({
            displayType : serverWidget.FieldDisplayType.HIDDEN
        });

        lineId.updateDisplayType({
            displayType : serverWidget.FieldDisplayType.HIDDEN
        });

        vendBillSublist.addField({
            id: 'custpage_type',
            type: serverWidget.FieldType.TEXT,
            label: 'Type'
        });

        vendBillSublist.addField({
            id: 'custpage_entity',
            type: serverWidget.FieldType.TEXT,
            label: 'Vendor'
        });

        vendBillSublist.addField({
            id: 'custpage_tran_id',
            type: serverWidget.FieldType.TEXT,
            label: 'Reference No.'
        });

        vendBillSublist.addField({
            id: 'custpage_tran_number',
            type: serverWidget.FieldType.TEXT,
            label: 'Vendor Bill/Credit #'
        });

        vendBillSublist.addField({
            id: 'custpage_account',
            type: serverWidget.FieldType.TEXT,
            label: 'Account'
        });

        vendBillSublist.addField({
            id: 'custpage_date',
            type: serverWidget.FieldType.TEXT,
            label: 'Date'
        });

        vendBillSublist.addField({
            id: 'custpage_vend_cat',
            type: serverWidget.FieldType.TEXT,
            label: 'Vendor Category'
        });

        vendBillSublist.addField({
            id: 'custpage_memo',
            type: serverWidget.FieldType.TEXT,
            label: 'Memo'
        });

        // Perform the search for vendor bills
        var vendorBillLineSearch = search.create({
            type: search.Type.TRANSACTION,
            filters: [
                ['mainline', 'is', false],
                'AND',
                ['custbody_nco_sch_allocations', 'is', true],
                'AND',
                ['approvalstatus', 'anyof', '2'],
                'AND',
                ['custbody_nco_rel_adv_ic_je', 'anyof', '@NONE@'],
                'AND',
                ['line.cseg_nco_billclient', 'anyof', '@NONE@'],
                'AND',
                ['subsidiary', 'is', 38], //change to MPS
                'AND',
                [
                    ['type', 'anyof', 'VendBill'],
                    'OR',
                    ['type', 'anyof', 'VendCred']
                ]
            ],
            columns: [
                'internalid',
                'line',
                'tranid',
                'transactionnumber',
                'trandate',
                'type',
                'name',
                'entity',
                'account',
                'memo',
                'custbody_nco_vendor_category',
                'line.cseg_nco_billclient'
            ]
        });

        var searchResult = vendorBillLineSearch.run().getRange({
            start: 0,
            end: 1000
        });

        // Add the search results to the sublist
        for (var i = 0; i < searchResult.length; i++) {

            var intId = searchResult[i].getValue({name: 'internalid'});

            vendBillSublist.setSublistValue({
                id: 'custpage_type',
                line: i,
                value: searchResult[i].getValue({name: 'type'})
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_tran_id',
                line: i,
                value: searchResult[i].getValue({name: 'tranid'}) ? searchResult[i].getValue({name: 'tranid'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_tran_number',
                line: i,
                value: searchResult[i].getValue({name: 'transactionnumber'}) ? searchResult[i].getValue({name: 'transactionnumber'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_entity',
                line: i,
                value: headerInfo[intId].entity
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_date',
                line: i,
                value: searchResult[i].getValue({name: 'trandate'}) ? searchResult[i].getValue({name: 'trandate'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_memo',
                line: i,
                value: searchResult[i].getValue({name: 'memo'}) ? searchResult[i].getValue({name: 'memo'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_account',
                line: i,
                value: searchResult[i].getValue({name: 'account'}) ? searchResult[i].getValue({name: 'account'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_vend_cat',
                line: i,
                value: searchResult[i].getValue({name: 'custbody_nco_vendor_category'}) ? searchResult[i].getValue({name: 'custbody_nco_vendor_category'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_rec_int_id',
                line: i,
                value: searchResult[i].getValue({name: 'internalid'}) ? searchResult[i].getValue({name: 'internalid'}) : '-'
            });

            vendBillSublist.setSublistValue({
                id: 'custpage_line_id',
                line: i,
                value: searchResult[i].getValue({name: 'line'}) ? searchResult[i].getValue({name: 'line'}) : '-'
            });
        }

        // Add a submit button to the form
        form.addSubmitButton({
            label: 'Create Advanced Intercompany Journal Entries'
        });

        // Display the form
        context.response.writePage(form);

        if (context.request.method === 'POST') {

            var linesToUpdate = {};

            for (var p = 0; p < vendBillSublist.lineCount; p++) {

                var selectValue = context.request.getSublistValue({
                    group: 'custpage_vendorbill_sublist',
                    name: 'custpage_select',
                    line: p
                });

                log.debug({'title' : 'selectValue', 'details' : selectValue});

                if (selectValue === true || selectValue == 'T') {

                    var recIntId = context.request.getSublistValue({
                        group: 'custpage_vendorbill_sublist',
                        name: 'custpage_rec_int_id',
                        line: p,
                    });

                    var recType = context.request.getSublistValue({
                        group: 'custpage_vendorbill_sublist',
                        name: 'custpage_type',
                        line: p,
                    });

                    var lineIntId = context.request.getSublistValue({
                        group: 'custpage_vendorbill_sublist',
                        name: 'custpage_line_id',
                        line: p,
                    });

                    if(!linesToUpdate.hasOwnProperty(recIntId)) {

                        linesToUpdate[recIntId] = {
                            type : recType,
                            lineIntIds : [lineIntId]
                        }
                    } else {
                        linesToUpdate[recIntId].lineIntIds.push(lineIntId);
                    }

                    log.debug({'title' : 'linesToUpdate', 'details' : JSON.stringify(linesToUpdate)});

                }
            }

            //Schedule Script

            var scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT
            });

            // Set the script ID and deployment ID of the scheduled script
            scriptTask.scriptId = 'customscript_nco_sch_allocations_sch';
            scriptTask.deploymentId = null;
            scriptTask.params = {
                custscript_nco_lines_to_process: linesToUpdate,
                custscript_nco_amortization_schedule_id: context.request.parameters.custpage_amortz_sch,
                custscript_nco_allocation_schedule_id: context.request.parameters.custpage_allocation_sch,
                custscript_nco_allocation_user_id: runtime.getCurrentUser(),
            };

            var taskId = scriptTask.submit();

            var submissionForm = serverWidget.createForm({
                title: 'Your allocation schedules are currently being processed.'
            });

            context.response.writePage(submissionForm);
        }
    }

    return {
        onRequest: onRequest
    };
});