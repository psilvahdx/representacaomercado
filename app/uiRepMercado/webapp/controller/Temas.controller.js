/* eslint-disable no-undef */
/* eslint-disable @sap/ui5-jsdocs/no-jsdoc */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/model/Sorter"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox, Sorter) {
	"use strict";
   
	return BaseController.extend("ps.uiRepMercado.controller.Temas", {
        
		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel;

			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),				
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText")
			});
            this.setModel(oViewModel, "temasView");

			// Add the worklist page to the flp routing history
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("temasViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#RepresentacaoMercado-display"
			}, true);
        
        },
        
        getUserData: function(){
            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),
                oObject = this.getModel("userLogModel"),
                that = this;
           if(!oObject.getProperty("/userLog/ID")){
                oModel.read("/UsersExtensions", {
                    urlParameters: {
                            "$expand": "userProfile,acoes"
                        },
                    success: function (oData) {                    
                        oObject.setProperty("/userLog",oData.results[0]);      
                        //that.getComissoes(oObject.getProperty("/userLog/ID"));               
                    },
                    error: function (oError) {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }
            
        },

        /*getComissoes: function(sUserID){

            var oView = this.getView(),
                oOwnerComponent = this.getOwnerComponent(),
                oModel = this.getModel(),              
                that = this,
                sPath = "/Usuarios('" + sUserID + "')/comissoes";

            if (sUserID) {              

                oModel.read(sPath, {
                    urlParameters: {
                        "$expand": "comissao"
                    },
                    success: function (oData) {
                        var oCommissoesModel = new JSONModel(oData);
                        oView.setModel(oCommissoesModel, "userComissoesModel");  
                    },
                    error: function (oError) {

                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_comissoes_erro"));
                    }

                });
            }
        },*/

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
            var sTitle,
                sMessage,
                that = this,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
            // the table is not empty
             // @ts-ignore
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
                sTitle = this.getResourceBundle().getText("worklistTableTitle");
                sMessage = this.getResourceBundle().getText("nenhum_registro_encontrado_cadastro");
                var oFilterData = this.getModel("filterModel").getData();
                if(oFilterData.temas.tema !== ""){
                MessageBox.information(
				sMessage,
				{
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function(sAction) {
						if(sAction === MessageBox.Action.YES){
							that.getRouter().navTo("detalheTema", {
				                idTema: "New"
			                }); 
						}
					}
				}
            );
            }


			}
            this.getModel("temasView").setProperty("/worklistTableTitle", sTitle);
            this.getUserData();
        },
        
        onCreatePress: function(oEvent){
           this.getRouter().navTo("detalheTema", {
				idTema: "New"
			}); 
        },

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onTableItemPress : function (oEvent) {
			var oContext = oEvent.getParameter("listItem").getBindingContext(),
			oObject = this.getModel().getObject(oContext.getPath());

			//this.showBusy();
			this.getRouter().navTo("detalheTema", {
				idTema: oObject.ID
			});
        },

        createFilter: function(key, value, operator, useToLower) {
	        return new Filter(useToLower ? "tolower(" + key + ")" : key, operator, useToLower ? "'" + value.toLowerCase() + "'" : value)
        },
        
        buildFilters: function (oFilterTema) {

            var aFilter = new Filter([]),
			    oFilter = {};
            
                if(oFilterTema.tema){
                    //oFilter = this.createFilter("descricao", oFilterTema.tema, FilterOperator.Contains,true);
                    oFilter = new Filter({
                                path: 'descricao',
                                operator: FilterOperator.Contains,
                                value1: oFilterTema.tema,
                                caseSensitive: false
                            });
				    aFilter.aFilters.push(oFilter);
                }
                if (oFilterTema.status) {
                    for (let i = 0; i < oFilterTema.status.length; i++) {
                        var status_ID = oFilterTema.status[i];
                        oFilter = new Filter("status_ID", FilterOperator.EQ, status_ID);
				        aFilter.aFilters.push(oFilter); 
                    }
                    
                }
                if (oFilterTema.comissoes) {
                    for (let i = 0; i < oFilterTema.comissoes.length; i++) {
                        var comissao_ID = oFilterTema.comissoes[i];
                        oFilter = new Filter("comissao_ID", FilterOperator.EQ, comissao_ID);
				        aFilter.aFilters.push(oFilter); 
                    }
                    
                }

            return aFilter;
        },


		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
			
				this.onRefresh();
			} else {
                var aTableSearchState = [],
                    filterModel = this.getModel("filterModel"),
                    oTable = this.byId("tblTemas"),
				    oBinding = oTable.getBinding("items"),			
                    oFilterTemas = filterModel.getProperty("/temas"),
                    aSelKeysStatus = this.byId("mtCBoxStatus").getSelectedKeys(),
                    aSelKeysComis = this.byId("mtCBoxComissoes").getSelectedKeys(); 
                    if(aSelKeysStatus && aSelKeysStatus.length > 0 ){
                         oFilterTemas.status = aSelKeysStatus;
                    }else{
                        oFilterTemas.status = [];
                    }  
                    if(aSelKeysComis && aSelKeysComis.length > 0 ){
                         oFilterTemas.comissoes = aSelKeysComis;
                    }else{
                        oFilterTemas.comissoes = [];
                    }                      
                   
                aTableSearchState = this.buildFilters(oFilterTemas);
                oBinding.filter(aTableSearchState.aFilters);
                //this._applySearch(aTableSearchState);
			}

        },     

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("tblTemas");
			oTable.getBinding("items").refresh();
		},

        onCadUserTilePress: function(oEvent){
             this.getRouter().navTo("cadUserApp"); 
        },

        onCadReguladoresTilePress: function(){
            this.getRouter().navTo("cadReguladoresApp"); 
        },
        
        onCadComissoesTilePress: function(){
            this.getRouter().navTo("cadComissoesApp"); 
        }

	});
});