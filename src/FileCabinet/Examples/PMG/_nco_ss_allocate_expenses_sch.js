/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/format'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search, runtime, format) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {

            var scriptObj = runtime.getCurrentScript();
            var trxDetails = JSON.parse(scriptObj.getParameter({name: 'custscript_nco_vend_bills'}));
            var userDetails = JSON.parse(scriptObj.getParameter({name: 'custscript_nco_user'}));
            var centralTime = format.format({
                value: new Date(),
                type: format.Type.DATETIME,
                timezone: format.Timezone.AMERICA_CHICAGO
            });

            //Get Accounting Preferences

            var currentUser = runtime.getCurrentUser();
            var icRecAcct = currentUser.getPreference('DEFAULT_ICJE_AUTOBAL_RECACCT')
            var icPayAcct = currentUser.getPreference('DEFAULT_ICJE_AUTOBAL_PAYACCT')

            //Get Amortization Schedule Data

            var templateSearch = search.create({
                type: search.Type.AMORTIZATION_TEMPLATE,
                filters: [{
                    name: 'isinactive',
                    operator: 'is',
                    values: ['F']
                }],
                columns: ['deferralaccount', 'internalid']
            });

            var templateSearchResult = templateSearch.run().getRange({
                start: 0,
                end: 1000
            });

            var templateObject = {};

            for (var i = 0; i < templateSearchResult.length; i++) {
                templateObject[templateSearchResult[i].getValue({name: 'internalid'})] = templateSearchResult[i].getValue({name: 'deferralaccount'});
            }

            //Get Reporting Client Data

            var reportingClientSearch = search.create({
                type: 'customrecord_cseg_nco_billclient',
                filters: [],
                columns: ['custrecord_nco_client_sub', 'internalid']
            });

            var reportingClientObject = {};

            var pagedData = reportingClientSearch.runPaged({pageSize: 1000});

            for (var i = 0; i < pagedData.pageRanges.length; i++) {

                var currentPage = pagedData.fetch(i);

                currentPage.data.forEach(function (result) {
                    reportingClientObject[result.getValue({name: 'internalid'})] = result.getValue({name: 'custrecord_nco_client_sub'});
                })
            }

            //Get Subsidiary Info

            var subsidiarySearch = search.create({
                type: search.Type.SUBSIDIARY,
                filters: [{
                    name: 'isinactive',
                    operator: 'is',
                    values: ['F']
                }],
                columns: ['representingvendor', 'internalid']
            });

            var subsidiarySearchResult = subsidiarySearch.run().getRange({
                start: 0,
                end: 1000
            });

            var subsidiaryObject = {};

            for (var i = 0; i < subsidiarySearchResult.length; i++) {
                subsidiaryObject[subsidiarySearchResult[i].getValue({name: 'internalid'})] = subsidiarySearchResult[i].getValue({name: 'representingvendor'});
            }

            //Get Account Data

            var accountSearch = search.create({
                type: record.Type.ACCOUNT,
                filters: [{
                    name: 'isinactive',
                    operator: 'is',
                    values: ['F']
                }],
                columns: ['name', 'internalid', 'number']
            });

            var accountSearchResults = accountSearch.run().getRange({
                start: 0,
                end: 1000
            });

            var accountObject = {};

            for (var i = 0; i < accountSearchResults.length; i++) {

                var key = accountSearchResults[i].getValue({name: 'number'}) + ' ' + accountSearchResults[i].getValue({name: 'name'});

                accountObject[key] = accountSearchResults[i].getValue({name: 'internalid'});
            }

            //Create Journals

            for (key in trxDetails) {

                //Get Transaction Fields

                var trxDetailsRecType = trxDetails[key].type;
                var recType = '';

                if (trxDetailsRecType == 'Bill') {
                    recType = record.Type.VENDOR_BILL;
                } else {
                    recType = record.Type.VENDOR_CREDIT;
                }

                var trxRec = record.load({
                    type: recType,
                    id: key
                });
                var trxRecSub = trxRec.getValue({
                    fieldId: 'subsidiary',
                });
                var trxRecTranDate = trxRec.getValue({
                    fieldId: 'trandate',
                });
                var trxRecMemo = trxRec.getValue({
                    fieldId: 'memo',
                });
                var trxRecEntity = trxRec.getValue({
                    fieldId: 'entity',
                });
                var trxLineCount = trxRec.getLineCount({
                    sublistId: 'expense'
                });

                if (!trxLineCount) {
                    continue;
                }

                //Create Journal Entry

                var newJe = record.create({
                    type: record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY,
                    isDynamic: true
                });

                //Set Journal Entry header fields

                newJe.setValue({
                    fieldId: 'subsidiary',
                    value: trxRecSub
                });
                newJe.setValue({
                    fieldId: 'trandate',
                    value: trxRecTranDate
                });
                newJe.setValue({
                    fieldId: 'memo',
                    value: trxRecMemo
                });
                newJe.setValue({
                    fieldId: 'custbody_nco_createdfrom',
                    value: key
                });
                newJe.setValue({
                    fieldId: 'custbody_nco_rel_bill_cred',
                    value: key
                });

                //Set Journal Entry Lines

                for (var x = 0; x < trxLineCount; x++) {

                    //Get vendor bill/credit line details

                    var trxRecLineAcct = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'account',
                        line: x
                    });
                    var trxRecLineMemo = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'memo',
                        line: x
                    });
                    var trxRecLineDept = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'department',
                        line: x
                    });
                    var trxRecLineCategory = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'categoryexpaccount',
                        line: x
                    });
                    var trxRecLineChannel = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'class',
                        line: x
                    });
                    var trxRecLineRegion = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'location',
                        line: x
                    });
                    var trxRecLineAmortizationSch = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizationsched',
                        line: x
                    });

                    log.debug({'title' : 'bill line #' + x, 'details' : x});

                    var trxRecLineAmortizationSchStart = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizstartdate',
                        line: x
                    });
                    var trxRecLineAmortizationSchEnd = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizationenddate',
                        line: x
                    });
                    var trxRecLineAmortizationType = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizationtype',
                        line: x
                    });
                    var trxRecLineAmount = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        line: x
                    });
                    var trxRecLineRepClient = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'cseg_nco_billclient',
                        line: x
                    });

                    for (var y = 1; y <= 4; y++) {

                        log.debug({'title': 'je line #', 'details': y});

                        var amountField = '';
                        var subsidiaryValue = '';
                        var memoValue = '';
                        var deptValue = '';
                        var regionValue = '';
                        var channelValue = '';
                        var repClientValue = '';
                        var entityValue = '';
                        var accountValue = '';
                        var dueToFromSubValue = '';
                        var amortizationSch = '';
                        var amortizationStart = '';
                        var amortizationEnd = '';

                        if (y == 1 || y == 4) {
                            amountField = 'credit';
                        } else {
                            amountField = 'debit';
                        }

                        if (y == 1 || y == 2) {
                            subsidiaryValue = trxRecSub;
                        } else {

                            subsidiaryValue = reportingClientObject[trxRecLineRepClient];

                            if (!subsidiaryValue) {

                                log.error('Script Error', 'Cannot create Adv IC JE because line is missing Reporting Client Subsidiary');
                                return; // error, should not process
                            }
                        }

                        if (y == 1 || y == 3) {

                            memoValue = trxRecLineMemo;
                            deptValue = trxRecLineDept;
                            regionValue = trxRecLineRegion
                            channelValue = trxRecLineChannel;
                            repClientValue = trxRecLineRepClient;
                            entityValue = trxRecEntity;
                            amortizationSch = trxRecLineAmortizationSch
                            amortizationStart = trxRecLineAmortizationSchStart;
                            amortizationEnd = trxRecLineAmortizationSchEnd;

                            //If there is an amortization schedule, use account from amortization template

                            if (trxRecLineAmortizationSch) {
                                accountValue = accountObject[templateObject[trxRecLineAmortizationSch]];

                                if (!accountValue) {
                                    accountValue = trxRecLineAcct
                                }

                            } else {
                                accountValue = trxRecLineAcct

                            }

                        } else {

                            memoValue = '';
                            deptValue = '';
                            regionValue = ''
                            channelValue = '';
                            amortizationSch = ''
                            amortizationStart = '';
                            amortizationEnd = '';
                        }

                        if (y == 2) {

                            accountValue = icRecAcct
                            dueToFromSubValue = reportingClientObject[trxRecLineRepClient];
                            entityValue = subsidiaryObject[reportingClientObject[trxRecLineRepClient]]; //Representing Vendor on Subsidiary

                        } else if (y == 4) {

                            accountValue = icPayAcct
                            dueToFromSubValue = trxRecSub;
                            entityValue = subsidiaryObject[trxRecSub];
                        }

                        newJe.selectNewLine({
                            sublistId: 'line'
                        });

                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'linesubsidiary',
                            value: subsidiaryValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: accountValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: amountField,
                            value: trxRecLineAmount
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'memo',
                            value: memoValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'department',
                            value: deptValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'location',
                            value: regionValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'cseg_nco_billclient',
                            value: repClientValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'categoryexpaccount',
                            value: trxRecLineCategory
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'class',
                            value: channelValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'entity',
                            value: entityValue
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'schedule',
                            value: trxRecLineAmortizationSch
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'startdate',
                            value: trxRecLineAmortizationSchStart
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'enddate',
                            value: trxRecLineAmortizationSchEnd
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'scheduletype',
                            value: trxRecLineAmortizationType
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'scheduletype',
                            value: trxRecLineAmortizationType
                        });
                        newJe.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'duetofromsubsidiary',
                            value: dueToFromSubValue
                        });
                        newJe.commitLine({
                            sublistId: 'line'
                        })
                    }
                }

                //Save Journal Entry

                var newJeId = '';

                try {

                    newJeId = newJe.save();

                    log.debug({'title': 'newJeId', 'details': newJeId});

                } catch (e) {
                    log.error('Script Error', 'Cannot create due to error: ' + e.message);
                    return; // error, should not process
                }

                //Create Log

                delete userDetails.department;
                delete userDetails.subsidiary;
                delete userDetails.roleCenter;
                delete userDetails.location;

                var logRec = record.create({
                    type: 'customrecord_all_exp_log',
                    isDynamic: true
                });

                logRec.setValue({
                    fieldId: 'custrecord_all_exp_log_user',
                    value: JSON.stringify(userDetails)
                });
                logRec.setValue({
                    fieldId: 'custrecord_all_exp_log_trx',
                    value: trxDetails
                });
                logRec.setValue({
                    fieldId: 'custrecord_all_exp_log_date',
                    value: centralTime
                });

                var logRecId = logRec.save();

                //Related JE to Bill/Credit and Save Transaction

                trxRec.setValue({
                    fieldId: 'custbody_nco_rel_adv_ic_je',
                    value: newJeId
                });

                trxRec.save();
            }
        }

        return {execute}
    });
