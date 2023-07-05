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
                ['custbody_nco_allocate_exp', 'is', true],
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

        if(!searchResultHeader || !searchResultHeader.length) {

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

        log.debug({'title' : 'test 2', "details" : JSON.stringify(headerInfo)});

        if (context.request.method === 'GET') {

            // Create the form
            var form = serverWidget.createForm({
                title: 'Allocate Expenses'
            });

            // Create the sublist
            var vendBillSublist = form.addSublist({
                id: 'custpage_vendorbill_sublist',
                type: serverWidget.SublistType.LIST,
                label: 'Vendor Bills and Credits'
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
                    ['custbody_nco_allocate_exp', 'is', true],
                    'AND',
                    ['approvalstatus', 'anyof', '2'],
                    'AND',
                    ['custbody_nco_rel_adv_ic_je', 'anyof', '@NONE@'],
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
                    'tranid',
                    'transactionnumber',
                    'trandate',
                    'type',
                    'name',
                    'entity',
                    'account',
                    'memo',
                    'custbody_nco_vendor_category'
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
            }

            // Add a submit button to the form
            form.addSubmitButton({
                label: 'Create Advanced Intercompany Journal Entries'
            });

            // Display the form
            context.response.writePage(form);

        } else if (context.request.method === 'POST') {

            //create JEs

            var scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT
            });

            // Set the script ID and deployment ID of the scheduled script
            scriptTask.scriptId = 'customscript_nco_allocate_expenses_sch';
            scriptTask.deploymentId = null;
            scriptTask.params = {
                custscript_nco_vend_bills: headerInfo,
                custscript_nco_user: runtime.getCurrentUser(),
            };

            var taskId = scriptTask.submit();

            var submissionForm = serverWidget.createForm({
                title: 'Your request to allocate expenses is currently being processed.'
            });

            context.response.writePage(submissionForm);
        }
    }

    return {
        onRequest: onRequest
    };
});
