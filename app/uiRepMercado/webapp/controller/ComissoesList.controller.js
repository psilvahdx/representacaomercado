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
            var oComissaoModel = new JSONModel({
                descricaoFilter : "",
                reguladorFilter: "",
                reguladorFilterId: null,
                comissoesRowCount: 0});

            this.setModel(oComissaoModel, "comissoesView"); 

            this.getRouter().getRoute("cadComissoesApp").attachPatternMatched(this._onObjectMatched, this);

        },

        _onObjectMatched: function () {
            var oTableBinding = this.getView().byId("tblComissoes").getBinding("items");
            oTableBinding.attachChange(function(){
                var sRowCount = this.getView().byId("tblComissoes").getItems().length;
                this.getView().getModel("comissoesView").setProperty("/comissoesRowCount", sRowCount);
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
                        //that.getComissoes(oObject.getProperty("/userLog/ID"));               
                    },
                    error: function () {
                        oOwnerComponent._genericErrorMessage(that.geti18nText("load_representante_erro"));
                    }

                });
            }
            
        },
        
        onCreatePress: function(){
           this.getOwnerComponent().getRouter().navTo("detalhesComissao", {
				idComissao: "New"
			});
        },

		onTableItemPress : function (oEvent) {
            var sId = oEvent.getParameter("listItem").getCells()[0].getText()
            this.getOwnerComponent().getRouter().navTo("detalhesComissao", {
				idComissao: sId
			}); 
        },

		onSearch : function () {
            var oTableBinding = this.getView().byId("tblComissoes").getBinding("items"),
            sDescFilter = this.getView().byId("filterDesc").getValue(),
            sReguladorFilter = this.getView().getModel("comissoesView").getProperty("/reguladorFilterId"),
            bAnd = false,
            aFilters = [];

            aFilters.push(new Filter("descricao", FilterOperator.Contains, sDescFilter));
            if(sReguladorFilter){
                aFilters.push(new Filter("regulador_ID", FilterOperator.EQ, sReguladorFilter));
                bAnd = true;
            }
            
            oTableBinding.filter(new Filter(aFilters, bAnd));
        },       

        onPageNavButtonPress: function(){
             history.go(-1);
        },

        showReguladorValueHelp: function(){
            if (!this._oDialogReguladores) {
                this._oDialogReguladores = sap.ui.xmlfragment("ps.uiRepMercado.view.fragments.Reguladores", this);
                this.getView().addDependent(this._oDialogReguladores);
                this.getView().getModel().read("/Reguladores", {                   
                    success: function (oData) {
                        var oReguladoresModel = new JSONModel(oData);
                        this.getView().setModel(oReguladoresModel, "reguladoresModel");
                    }.bind(this),
                    error: function (oError) {
                        var oErrorMsg = JSON.parse(oError.responseText);
                        MessageBox.error(oErrorMsg.error.message.value);
                    }
                });
            }
            this._oDialogReguladores.open();
        },

        onReguladoresConfirm: function(oEvent){
            if(oEvent.getParameter("selectedItem")){
                var sReguladorPath = oEvent.getParameter("selectedItem").getBindingContext("reguladoresModel").getPath();
                var oRegulador = this.getView().getModel("reguladoresModel").getProperty(sReguladorPath);
                this.getView().getModel("comissoesView").setProperty("/reguladorFilter", oRegulador.descricao);
                this.getView().getModel("comissoesView").setProperty("/reguladorFilterId", oRegulador.ID);
            }else{
                this.getView().getModel("comissoesView").setProperty("/reguladorFilter", "");
                this.getView().getModel("comissoesView").setProperty("/reguladorFilterId", null);  
            }
            this.getView().getModel("comissoesView").refresh();
        },

        onSearchReguladores: function(oEvent){
            var sValue = oEvent.getParameter("value");
            var oBinding = oEvent.getSource().getBinding("items");
            var aFilters = [];
            // @ts-ignore
            aFilters.push(new Filter("descricao", FilterOperator.Contains, sValue));
            oBinding.filter(aFilters);
        }
	});
});