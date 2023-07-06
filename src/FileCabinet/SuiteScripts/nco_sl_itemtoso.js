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
        title: "Inside Try OnGet",
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
  }

  function onError(params) {
    // TODO
  }

  return { onRequest };
});
