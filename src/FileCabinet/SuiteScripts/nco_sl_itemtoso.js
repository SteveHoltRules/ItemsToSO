/**
 * This is a basic suitelet that should load the Query in a list format, then the suitelet should load the query using onGet. Currently this does not do anything onPost
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
  "N/file",
  "N/format",
  "N/https",
  "N/query",
  "N/record",
  "N/runtime",
  "N/search",
  "N/task",
  "N/ui/message",
  "N/ui/serverWidget",
  "N/url",
], /**
 * @param{file} file
 * @param{format} format
 * @param{https} https
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 * @param{message} message
 * @param{serverWidget} serverWidget
 * @param{url} url
 */ (
  file,
  format,
  https,
  query,
  record,
  runtime,
  search,
  task,
  message,
  serverWidget,
  url
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */

  const historicalSales = (entityId, form) => {
    try {
      log.debug("Inside Historical Sales", entityId);
      let sql = `SELECT TRANSACTION.TranID AS tranid,
      TRANSACTION.TranDate AS date,
      TransactionLine.rate,
      TransactionLine.quantity AS quantity,
     TransactionLine.item AS item_name,
    BUILTIN.DF(TransactionLine.units) AS units
  FROM TRANSACTION
  INNER JOIN transactionLine ON TRANSACTION.id = transactionLine.TRANSACTION
  WHERE TRANSACTION.Entity = 17815 AND Transaction.type = 'CustInvc' AND TransactionLine.itemtype = 'InvtPart'
  UNION ALL
  SELECT custrecord_nco_so_hist_invnum AS tranid,
      custrecord_nco_so_hist_date AS date,
      custrecord_nco_so_hist_item_price AS rate,
      custrecord_nco_so_hist_qty AS quantity,
      custrecord_nco_so_hist_item AS item_name,
    BUILTIN.DF(custrecord_nco_so_hist_uom) AS units
  FROM customrecord_nco_so_hist_lines
  WHERE custrecord_nco_so_hist_lines_cust = 17815`;
      log.debug({title: 'SQL statement', details: sql});
      let results = query.runSuiteQL({ query: sql }).asMappedResults();
      log.debug({title: 'SQL Results', details: results});
// netsuite doesn't like my union statement...
      // if (results.length > 0) {
      //   log.debug({title: "inside results length", details: results.length});
      //   let listSales = form.addSublist({
      //     id: 'custpage_sl_sales',
      //     label: `Item Sales (${results.length})`,
      //     type: serverWidget.SublistType.LIST,
      //   });

      //   listSales.addField({
      //     id: 'custpage_sl_histsales_select',
      //     label: 'Select',
      //     type: 'checkbox'
      //   });

      //   listSales.addField({
      //     id: "custpage_sl_histsales_tranid",
      //     label: "Trans Id",
      //     type: serverWidget.FieldType.TEXT,
      //   });
      //   listSales.addField({
      //     id: "custpage_sl_histsales_date",
      //     label: "Date",
      //     type: serverWidget.FieldType.TEXT,
      //   });
      //   listSales.addField({
      //     id: "custpage_sl_histsales_rate",
      //     label: "Rate",
      //     type: serverWidget.FieldType.TEXT,
      //   });
      //   listSales.addField({
      //     id: "custpage_sl_histsales_quantity",
      //     label: "Quantity",
      //     type: serverWidget.FieldType.TEXT,
      //   });
      //   listSales.addField({
      //     id: "custpage_sl_histsales_item_name",
      //     label: "Item Name",
      //     type: serverWidget.FieldType.TEXT,
      //   });

      //   let columnNames = Object.keys(results[0]);
      //   for (let i = 0; i < results.length; i++) {
      //     let result = results[i];
      //     for (let c = 0; c < columnNames.length; c++) {
      //       let columnName = columnNames[c];
      //       let value = result[columnName];
      //       switch (columnName) {
      //         case "tranid":
      //           listSales.setSublistValue({
      //             id: "custpage_sl_histsales_tranid",
      //             line: i,
      //             value: value,
      //           });
      //           break;
      //         case "date":
      //           listSales.setSublistValue({
      //             id: "custpage_sl_histsales_date",
      //             line: i,
      //             value: value,
      //           });
      //           break;
      //         case "rate":
      //           listSales.setSublistValue({
      //             id: "custpage_sl_histsales_rate",
      //             line: i,
      //             value: value,
      //           });
      //           break;
      //         case "quantity":
      //           listSales.setSublistValue({
      //             id: "custpage_sl_histsales_quantity",
      //             line: i,
      //             value: value,
      //           });
      //           break;
      //         case "item_name":
      //           listSales.setSublistValue({
      //             id: "custpage_sl_histsales_item_name",
      //             line: i,
      //             value: value,
      //           });
      //           break;
      //         default:
      //       }
      //     }
      //   }
      // }
      return results;
    } catch (e) {
      log.debug({
        title: `historical sales`,
        details: `name: ${e.name}, message: ${e.message}`,
      });
      return false;
    }
  };




  const onRequest = (scriptContext) => {
    // Perform the search for the items

    log.audit({ title: `${scriptContext.request.method} request received` });

    const eventRouter = {
      [https.Method.GET]: onGet(scriptContext),
      [https.Method.POST]: onPost(scriptContext),
    };

    try {
      log.audit({
        title: "Inside Try OnRequest",
        details: `${scriptContext.request.method}`,
      });
      eventRouter[scriptContext.request.method](scriptContext);
    } catch (e) {
      onError({ scriptContext: scriptContext, error: e });
    }

    log.audit({ title: "Request complete." });
  };

  function onGet(scriptContext) {
    // TODO
    // onGet is used for posting existing data - this is not for the post information - parameters in the get has to come from the URL
    // onPost has to come from the URL - what are the tools to parse the post?

    // pass the paramters from the context parameters
    log.debug({ title: `ln 79 parameters`, details: `inside onGet` });

    let parameters = scriptContext.request.parameters;

    const {custpage_sl_histsales_cust} = scriptContext.request.parameters
    // defines item here with no parameter
    // if parameters.item does not equal undefined then take the parameter and redefine the item as the parameter item, else move on and create the form
    // let item;

    // how do I define the parameters? Is this done in the client script?
    if (typeof parameters.entityId != "undefined") {
      custpage_sl_histsales_cust = parameters.entityId;
    }
    const scriptObj = runtime.getCurrentScript();

    /**
     * Form is defined here
     *
     */
    let form = serverWidget.createForm({
      title: "Historical Sales Orders",
    });

    /**
     * What does this path do? - Ask Rick
     * Client script - select the client script here - this is what runs the functions for the UI interface
     *
     */
    // try {
    //   // this is a client script - has to be created - this is a current failpoint.
    //   form.clientScriptModulePath = '/SuiteScripts/Custom Reports/nco_cl_inv_item_detail.js';
    // } catch(e) {
    //   log.error({title: `ln 93`, details: `name: ${e.name}, message: ${e.message}`});
    // }

    //todo: add Sales Orders stuff to form - define and create the form

    const fldTranId = form.addField({
      id: "custpage_sl_histsales_tranid",
      label: "Trans Id",
      type: serverWidget.FieldType.TEXT,
    });

    const fldCustomer = form.addField({
      id: 'custpage_sl_histsales_cust',
      label: 'Customer',
      type: 'select',
      source: 'customer'
    });

    if (custpage_sl_histsales_cust) fldCustomer.defaultValue = custpage_sl_histsales_cust;
    // make these inline

    fldTranId.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.INLINE,
    });
    fldCustomer.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.NORMAL,
    });

    // Help Fields
    fldTranId.setHelpText({help : `The transaction ID.`});
    fldCustomer.setHelpText({help : `This is the customer.`});

    let resultList = form.addSublist({
      id: "custpage_sl_one", // Sublist 1 of #
      label: `Item Usage`,
      type: serverWidget.SublistType.LIST, //
    });

    var customerSelected = form.getField({id: 'custpage_sl_histsales_cust'});
    log.debug({title: "CustomerSelected", details: customerSelected})

    if (!customerSelected) {
      scriptContext.response.writePage(form);
      return;
    }

    const selectField = resultList.addField({
      id: 'custpage_sl_histsales_select',
      type: serverWidget.FieldType.CHECKBOX,
      label: 'Select'
    });

    // Add field for sublist
    resultList.addField({
      id: "custpage_sl_histsales_tranid",
      label: "Tran Id",
      type: serverWidget.FieldType.TEXT,
    });
    resultList.addField({
      id: "custpage_sl_histsales_item_name",
      label: "Item",
      type: serverWidget.FieldType.TEXT,
    });
    // resultList.addField({id: 'custpage_sl_item_name',label: 'Item',type: serverWidget.FieldType.TEXT});
    resultList.addField({
      id: "custpage_sl_histsales_date",
      label: "Date",
      type: serverWidget.FieldType.DATE,
    });
    resultList.addField({
      id: "custpage_sl_histsales_rate",
      label: "Rate",
      type: serverWidget.FieldType.FLOAT,
    });
    resultList.addField({
      id: "custpage_sl_histsales_quantity",
      label: "Quantity",
      type: serverWidget.FieldType.FLOAT,
    });

    const entityId = form.getField({id: 'custpage_sl_histsales_cust'});

    let results = historicalSales(entityId, form);

    log.debug({
      title: "ln 155: typeof(results)",
      details: `${typeof results}`,
    });

    if (results.length > 0) {
      let columnNames = Object.keys(results[0]);

      for (let r = 0; r < results.length; r++) {
        let result = results[r];

        
        if (r === 0) {
          form.updateDefaultValues({
            custpage_sl_histsales_select: `F`,
            custpage_sl_histsales_tranid: `${results[0].tranid}`,
            custpage_sl_histsales_item_name: `${results[0].item_name}`,
            custpage_sl_histsales_date: `${results[0].date}`,
            custpage_sl_histsales_rate: `${results[0].rate}`,
            custpage_sl_histsales_quantity: `${results[0].quantity}`,
          });
        }
        for (let c = 0; c < columnNames.length; c++) {
          let columnName = columnNames[c];
          let value = result[columnName];
          // resultList.addField({
          //   id: 'custpage_sl_histsales_ioselect',
          //   label: 'Sales Order',
          //   type: 'select',
          // });
          // resultList.setSublistValue({
          //   id:'custpage_sl_histsales_ioselect',
          //   line: r,
          //   value: 'F',
          // });
          switch (columnName) {
                case "tranid":
                  resultList.setSublistValue({
                    id: "custpage_sl_histsales_tranid",
                    line: r,
                    value: value,
                  });
                  break;
                case "date":
                  resultList.setSublistValue({
                    id: "custpage_sl_histsales_date",
                    line: r,
                    value: value,
                  });
                  break;
                case "rate":
                  resultList.setSublistValue({
                    id: "custpage_sl_histsales_rate",
                    line: r,
                    value: value,
                  });
                  break;
                case "quantity":
                  resultList.setSublistValue({
                    id: "custpage_sl_histsales_quantity",
                    line: r,
                    value: value,
                  });
                  break;
                case "item_name":
                  resultList.setSublistValue({
                    id: "custpage_sl_histsales_item_name",
                    line: r,
                    value: value,
                  });
                  break;
                default:
              }
        }
      }
    }

    // if (typeof parameters.entityId != "undefined") {
    //   historicalSales(17815, form);
    // }

    // Add a submit button to the form - Submit button is in the onGet function. The trigger event is a programmed call into the onPost Function
    form.addSubmitButton({
        label: 'Create Sales Order'
    });

    scriptContext.response.writePage(form);
    log.debug({ title: "End onGet" });
  }

  function onPost(context) {
    // TODO
    //   onPost would fire on the submit
    // all values get passed into the HTTP object - would process the control value (reference by the control value). Posting it back to the server to do stuff.
    // could restate it in a text field so that it can be viewed, and then do something with it with a switch case.
    // suitelet pick a period and hit submit
    // process the post and list the values of the period selected - deposit the
    // reports/financial/
    // nco_sl_tkm_trialbalance

    const lineCount = context.request.getLineCount('custpage_quote_list');
      const unorderedLines = [];

      for (let j = 0; j < lineCount; j++) {
        const selected = context.request.getSublistValue('custpage_quote_list', 'custpage_select', j);
        const quote = context.request.getSublistValue('custpage_quote_list', 'custpage_quote', j);
        const line = context.request.getSublistValue('custpage_quote_list', 'custpage_line', j);
        const selectionNum = context.request.getSublistValue('custpage_quote_list', 'custpage_selection_num', j);

        if (selected != 'T') continue;

        const lineObj = {
          quote,
          line,
          selectionNum
        };

        unorderedLines.push(lineObj);
      }

      const sortedLines = _.sortBy(unorderedLines, 'selectionNum');
      const quotes = _.uniq(_.pluck(sortedLines, 'quote'));

      const fieldMap = {
        location: 'location',
        line: 'custcol_hci_line_id',
        item: 'item',
        custcol_mhi_hc_specialorder: 'custcol_mhi_hc_specialorder',
        custcol_mhi_hc_dropship: 'custcol_mhi_hc_dropship',
        memo: 'description',
        quantity: 'quantity',
        pricelevel: 'price',
        rate: 'rate',
        amount: 'amount',
        shipdate: 'expectedshipdate',
        custcol_hci_gp_vendor: 'povendor,custcol_hci_gp_vendor',
        custcol_hci_alternatevendor: 'custcol_hci_alternatevendor',
        custcol_hci_soporate: 'porate,custcol_hci_soporate',
        custcol_hf_item_type: 'custcol_hf_item_type',
        custcol_scm_customerpartnumber: 'custcol_scm_customerpartnumber',
        costestimate: 'costestimate'
      };

      salesOrder = record.transform({
        fromType: 'customer',
        fromId: customerId,
        toType: 'salesorder',
        isDynamic: true
      });

      salesOrder.setValue('orderstatus', 'A');
      salesOrder.setValue('otherrefnum', custpage_po_number);
      salesOrder.setValue('cseg_hci_branch', custpage_branch);

    for (let a = 0; a < sortedLines.length; a++) {
      const orderLineObj = sortedLines[a];

      // log.debug('orderLineObj', JSON.stringify(orderLineObj));

      const { quote, line } = orderLineObj;

      const quoteLineObj = _.findWhere(quoteLines, { id: quote, line });

      log.debug('quoteLineObj', JSON.stringify(quoteLineObj));

      if (quoteLineObj) {
        let isVendorItem = false;
        soLineCount += 1;
        orderLineObj.selectionNum = soLineCount;

        salesOrder.selectNewLine('item');
        salesOrder.setCurrentSublistValue('item', 'custcol_hci_linnkedquote', quoteLineObj.id);

        _.each(searchFields, (searchField) => {
          let value = quoteLineObj[searchField];
          const setColumns = fieldMap[searchField].split(',');

          // log.debug('searchField=' + searchField);

          if (value && searchField == 'shipdate') {
            value = format.parse({
              value,
              type: format.Type.DATE
            });
          } else if (value && (searchField == 'custcol_mhi_hc_specialorder' || searchField == 'custcol_mhi_hc_dropship')) {
            isVendorItem = true;
            return;
          }

          for (let c = 0; c < setColumns.length; c++) {
            const setColumn = setColumns[c];

            if (!isVendorItem && (setColumn == 'povendor' || setColumn == 'custcol_hci_gp_vendor' || setColumn == 'porate' || setColumn == 'custcol_hci_soporate')) {
              return;
            }

            if (value && setColumn == 'povendor') {
              value = parseInt(value);
            } else if (value && setColumn == 'custcol_hci_line_id') {
              value = soLineCount;
            }

            // log.debug(setColumn, value);

            salesOrder.setCurrentSublistValue('item', setColumn, value);
          }
        });

        salesOrder.commitLine('item');
      }
    }

    if (!custpage_sales_order && quotes.length == 1) {
      const quote = record.load({
        type: 'estimate',
        id: sortedLines[0].quote,
        isDynamic: true
      });

      salesOrder.setValue('cseg_hci_branch', quote.getValue('cseg_hci_branch'));
      salesOrder.setValue('custbody_hf_fob', quote.getValue('custbody_hf_fob'));
      salesOrder.setValue('custbody_hci_freightterms', quote.getValue('custbody_hci_freightterms'));
      salesOrder.setValue('shipcarrier', quote.getValue('shipcarrier'));
      salesOrder.setValue('shipmethod', quote.getValue('shipmethod'));
      salesOrder.setValue('custbody_hf_freight_carrier', quote.getValue('custbody_hf_freight_carrier'));
      salesOrder.setValue('custbody_hci_ordercreator', quote.getValue('custbody_hci_ordercreator'));
      salesOrder.setValue('custbody_if_bol_notes', quote.getValue('custbody_if_bol_notes'));
      salesOrder.setValue('custbody_hf_third_party_account', quote.getValue('custbody_hf_third_party_account'));

      const salesOrderLineCount = salesOrder.getLineCount('salesteam');

      for (let s = salesOrderLineCount - 1; s >= 0; s--) {
        salesOrder.removeLine({
          sublistId: 'salesteam',
          line: s
        });
      }

      const salesTeamLineCount = quote.getLineCount('salesteam');

      for (let s = 0; s < salesTeamLineCount; s++) {
        salesOrder.selectNewLine('salesteam');
        salesOrder.setCurrentSublistValue('salesteam', 'employee', quote.getSublistValue('salesteam', 'employee', s));
        salesOrder.setCurrentSublistValue('salesteam', 'salesrole', quote.getSublistValue('salesteam', 'salesrole', s));
        salesOrder.setCurrentSublistValue('salesteam', 'isprimary', quote.getSublistValue('salesteam', 'isprimary', s));
        salesOrder.setCurrentSublistValue('salesteam', 'contribution', quote.getSublistValue('salesteam', 'contribution', s));
        salesOrder.commitLine('salesteam');
      }
    }

    const salesOrderId = salesOrder.save();

    log.debug('Sales Order Created, ID=' + salesOrderId);

    let scriptDeploymentId = null;

    const deploymentSearch = search.create({
      type: 'scriptdeployment',
      filters: search.createFilter({
        name: 'scriptid',
        operator: search.Operator.IS,
        values: 'customdeploy_mhi_hc_quote_to_order_sl'
      })
    });

    deploymentSearch.run().each((result) => {
      scriptDeploymentId = result.id;

      return false;
    });

    record.submitFields({
      type: 'scriptdeployment',
      id: scriptDeploymentId,
      values: { custscript_mhi_last_sales_order: salesOrderId }
    });

    const orderObj = {
      salesOrderId,
      lines: sortedLines
    };

    task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: 'customscript' + SCHEDULED_SCRIPT_EXT,
      deploymentId: 'customdeploy' + SCHEDULED_SCRIPT_EXT,
      params: { custscript_mhi_order: JSON.stringify(orderObj) }
    }).submit();

    context.response.sendRedirect({
      identifier: record.Type.SALES_ORDER,
      type: https.RedirectType.RECORD,
      editMode: false,
      id: salesOrderId
    });
    
  }


  function onError(params) {
    // TODO
  }

  return { onRequest };
});
