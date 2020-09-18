/* eslint-disable no-undef */
/* eslint-disable @sap/ui5-jsdocs/no-jsdoc */
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox) {
	"use strict";

	return BaseController.extend("ps.uiRepMercado.controller.ReguladoresList", {

        formatter: formatter,
        
		onInit : function () {
            var oReguladorModel = new JSONModel({
                descricaoFilter : "",
                reguladorIdFilter: null,
                reguladoresRowCount: 0});

            this.setModel(oReguladorModel, "reguladoresView"); 

            this.getRouter().getRoute("cadReguladoresApp").attachPatternMatched(this._onObjectMatched, this);

            var oFilter = this.getView().byId("reguladoresListFilterBar"),
				that = this;
				
			oFilter.addEventDelegate({
				"onAfterRendering": function(oEvent) {					
                    var oButton = oEvent.srcControl._oSearchButton,
                        oClearButton = oEvent.srcControl._oClearButtonOnFB;                    
                    oButton.setText(that.getResourceBundle().getText("pesquisar_btn"));
                    oClearButton.setText(that.getResourceBundle().getText("limpar_filtro_btn"));
				}
			});


        },

        _onObjectMatched: function () {
            var oTableBinding = this.getView().byId("tblReguladores").getBinding("items"),
                oObject = this.getModel("userLogModel").getData();
            
            if(oObject.userLog.userProfile_ID !== "ADM"){
            	    this.getRouter().navTo("temasList");
            }      
            
            oTableBinding.attachChange(function(){
                var sRowCount = this.getView().byId("tblReguladores").getItems().length;
                this.getView().getModel("reguladoresView").setProperty("/reguladoresRowCount", sRowCount);
            }.bind(this));
            this.getView().getModel().refresh();
        },
        
        getUserData: function(){
            var oOwnerComponent = this.getOwnerComponent(),
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
                    },
                    error: function () {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }
            
        },
        
        onCreatePress: function(){
           this.getOwnerComponent().getRouter().navTo("detalhesRegulador", {
				idRegulador: "New"
			});
        },

		onTableItemPress : function (oEvent) {
            var sId = oEvent.getParameter("listItem").getCells()[0].getText()
            this.getOwnerComponent().getRouter().navTo("detalhesRegulador", {
				idRegulador: sId
			}); 
        },

        onClearFilter: function(oEvent){
            this.getView().byId("filterDesc").setValue("");
            this.onSearch(); 
        },

		onSearch : function () {
            var oTableBinding = this.getView().byId("tblReguladores").getBinding("items"),
            sDescFilter = this.getView().byId("filterDesc").getValue(),
            aFilters = [];

            aFilters.push(new Filter({
                 path: 'descricao',
                        operator: FilterOperator.Contains,
                        value1: sDescFilter,
                        caseSensitive: false
            }));
            oTableBinding.filter(new Filter(aFilters, true));
        },       

        onPageNavButtonPress: function(){
            this.getView().byId("filterDesc").setValue("");
            this.onSearch();
             history.go(-1);
        },

        onTableRegulaodresSelectionChange: function(oEvent){

            var oSelContext = oEvent.getSource().getSelectedContexts();
            if (oSelContext.length > 0) {
                this.byId("btnDelRegulador").setEnabled(true);
            }else{
                this.byId("btnDelRegulador").setEnabled(false);
            }
            
        },

        onDeleteRegulador: function(oEvent){

            var oTblReguDelete = this.byId("tblReguladores"),
                oSelContext = oTblReguDelete.getSelectedContexts(),
                that = this,
                sMessage ="",
                sSuccessMsg="",
                sErrorMsg = "",
                aReguDelete="",
                oDeleteObjec = {
                    ids: ""
                }

            sErrorMsg = this.getResourceBundle().getText("erro_excluir_regulador");
            //Notifica que Regulador será removido
            if (oSelContext.length > 1) {
                 sMessage = this.getResourceBundle().getText("confirma_exclusao_reguladores_txt");
                 sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_reguladores");
            }else{
                sMessage = this.getResourceBundle().getText("confirma_exclusao_regulador_txt");
                sSuccessMsg = this.getResourceBundle().getText("sucesso_excluir_regulador");
            }          

            for (let i = 0; i < oSelContext.length; i++) {                
                const oRegDel = this.getModel().getObject(oSelContext[i].getPath());
                aReguDelete = aReguDelete + oRegDel.ID + ";";
            }

            oDeleteObjec.ids = aReguDelete;
           
            MessageBox.warning(
                sMessage,
                {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            that.sendDeleteReguladorRequest(oDeleteObjec, sSuccessMsg, sErrorMsg );
                        }
                    }
                });

        },

        sendDeleteReguladorRequest: function(sIdRegulador, successMsg, errorMsg){

            var oModel = this.getModel(),
                sSuccessMsg = successMsg,
                sErrorMsg = errorMsg,
                that = this;

            oModel.create("/deleteSelectedReguladores", sIdRegulador,{
                success: function(oData){
                     that.getOwnerComponent()._genericSuccessMessage(sSuccessMsg);
                     that.getView().getModel().refresh();
                     that.getView().byId("filterDesc").setValue("");
                     that.onSearch();
                },
                error: function(oError){
                     that.getOwnerComponent()._genericErrorMessage(sErrorMsg);
                     that.getView().getModel().refresh();
                     that.getView().byId("filterDesc").setValue("");
                     that.onSearch();
                }
            });
        }
	
	});
});