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
            var linesToProcess = JSON.parse(scriptObj.getParameter({name: 'custscript_nco_lines_to_process'}));
            var userDetails = JSON.parse(scriptObj.getParameter({name: 'custscript_nco_allocation_user_id'}));
            var allocationScheduleId = JSON.parse(scriptObj.getParameter({name: 'custscript_nco_allocation_schedule_id'}));
            var amortizationScheduleId = JSON.parse(scriptObj.getParameter({name: 'custscript_nco_amortization_schedule_id'}));
            var centralTime = format.format({
                value: new Date(),
                type: format.Type.DATETIME,
                timezone: format.Timezone.AMERICA_CHICAGO
            });

            if(amortizationScheduleId == 0 || !amortizationScheduleId) {
                amortizationScheduleId = '';
            }

            //Get Accounting Preferences

            var currentUser = runtime.getCurrentUser();
            var icRecAcct = currentUser.getPreference('DEFAULT_ICJE_AUTOBAL_RECACCT');
            var icPayAcct = currentUser.getPreference('DEFAULT_ICJE_AUTOBAL_PAYACCT');

            log.debug({'title': 'icRecAcct', 'details': icRecAcct});
            log.debug({'title': 'icPayAcct', 'details': icPayAcct});
            log.debug({'title': 'linesToProcess', 'details': linesToProcess});

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

            for (var s = 0; s < subsidiarySearchResult.length; s++) {
                subsidiaryObject[subsidiarySearchResult[s].getValue({name: 'internalid'})] = subsidiarySearchResult[s].getValue({name: 'representingvendor'});
            }

            //NCO Allocation Schedule

            var allocationScheduleSearch = search.create({
                type: 'customrecord_nco_alloc_split',
                filters: [{
                    name: 'custrecord_nco_alloc_split_parent',
                    operator: 'is',
                    values: [allocationScheduleId]
                }],
                columns: ['custrecord_nco_alloc_split_sub', 'custrecord_nco_alloc_split_perc', 'internalid']
            });

            var allocationScheduleSearchResult = allocationScheduleSearch.run().getRange({
                start: 0,
                end: 1000
            });

            var allocationScheduleObject = {};

            for (var w = 0; w < allocationScheduleSearchResult.length; w++) {

                allocationScheduleObject[allocationScheduleSearchResult[w].getValue({name: 'internalid'})] = {
                    subsidiary: allocationScheduleSearchResult[w].getValue({name: 'custrecord_nco_alloc_split_sub'}),
                    percentage: allocationScheduleSearchResult[w].getValue({name: 'custrecord_nco_alloc_split_perc'})
                };
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

            for (key in linesToProcess) {

                //Get Transaction Fields

                var trxDetailsRecType = linesToProcess[key].type;
                var recType = '';

                if (trxDetailsRecType == 'Bill' || trxDetailsRecType == 'VendBill') {
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

                var length = linesToProcess[key].lineIntIds.length;

                for (var x = 0; x < length; x++) {

                    //Get vendor bill/credit line details

                    var lineNumber = trxRec.findSublistLineWithValue({
                        sublistId: 'expense',
                        fieldId: 'line',
                        value: linesToProcess[key].lineIntIds[x]
                    });

                    var trxRecLineAcct = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'account',
                        line: lineNumber
                    });
                    var trxRecLineMemo = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'memo',
                        line: lineNumber
                    });
                    var trxRecLineDept = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'department',
                        line: lineNumber
                    });
                    var trxRecLineCategory = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'categoryexpaccount',
                        line: lineNumber
                    });
                    var trxRecLineChannel = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'class',
                        line: lineNumber
                    });
                    var trxRecLineRegion = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'location',
                        line: lineNumber
                    });
                    var trxRecLineAmortizationSch = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizationsched',
                        line: lineNumber
                    });

                    var trxRecLineAmortizationSchStart = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizstartdate',
                        line: lineNumber
                    });
                    var trxRecLineAmortizationSchEnd = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizationenddate',
                        line: lineNumber
                    });
                    var trxRecLineAmortizationType = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amortizationtype',
                        line: lineNumber
                    });
                    var trxRecLineAmount = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'amount',
                        line: lineNumber
                    });
                    var trxRecLineRepClient = trxRec.getSublistValue({
                        sublistId: 'expense',
                        fieldId: 'cseg_nco_billclient',
                        line: lineNumber
                    });

                    //Set first line

                    newJe.selectNewLine({
                        sublistId: 'line'
                    });

                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'linesubsidiary',
                        value: trxRecSub
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: trxRecLineAcct
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'credit',
                        value: trxRecLineAmount
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: trxRecLineAmount
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'department',
                        value: trxRecLineDept
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'location',
                        value: trxRecLineRegion
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'categoryexpaccount',
                        value: trxRecLineCategory
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'class',
                        value: trxRecLineChannel
                    });
                    newJe.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'schedule',
                        value: amortizationScheduleId
                    });
                    newJe.commitLine({
                        sublistId: 'line'
                    })

                    //Set IC lines

                    for (key in allocationScheduleObject) {

                        for (var z = 1; z <= 3; z++) {

                            var allocationSubsidiary = allocationScheduleObject[key].subsidiary;
                            var allocationPercentage = parseFloat(allocationScheduleObject[key].percentage) / 100;
                            var amountField = ''
                            var amountValue = trxRecLineAmount * allocationPercentage;
                            var subsidiaryValue = '';
                            var memoValue = '';
                            var deptValue = '';
                            var regionValue = '';
                            var channelValue = '';
                            var entityValue = '';
                            var accountValue = '';
                            var dueToFromSubValue = '';


                            log.debug({'title': 'z', 'details': z});

                            if (z == 1 || z == 2) {
                                amountField = 'debit';
                            } else if (z == 3) {
                                amountField = 'credit';
                            }

                            if (z == 1) {

                                subsidiaryValue = trxRecSub;
                                dueToFromSubValue = allocationSubsidiary;

                            } else if (z == 2 || z == 3) {

                                subsidiaryValue = allocationSubsidiary;
                                memoValue = trxRecLineMemo;
                            }

                            if (z == 1) {
                                accountValue = icRecAcct;
                            } else if (z == 2) {
                                accountValue = trxRecLineAcct;
                            } else if (z == 3) {
                                accountValue = icPayAcct;
                            }

                            if(z == 1) {
                                entityValue = subsidiaryObject[allocationSubsidiary];
                            }

                            if (z == 2) {
                                deptValue = trxRecLineDept;
                                regionValue = trxRecLineRegion;
                                channelValue = trxRecLineChannel;
                                entityValue = '';

                            }

                            if (z == 3) {
                                entityValue = subsidiaryObject[trxRecSub];
                                dueToFromSubValue = trxRecSub;
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
                                value: parseInt(accountValue)
                            });
                            newJe.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: amountField,
                                value: amountValue
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
                                value: amortizationScheduleId
                            });
                            newJe.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'duetofromsubsidiary',
                                value: dueToFromSubValue
                            });
                            newJe.commitLine({
                                sublistId: 'line'
                            });

                        }
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
                    value: linesToProcess
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