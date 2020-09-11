/* eslint-disable no-undef */
// eslint-disable-next-line no-undef
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], /**
 * @param {typeof sap.ui.model.json.JSONModel} JSONModel 
 * @param {typeof sap.ui.core.routing.History} History 
 * @param {typeof sap.ui.model.Filter} Filter 
 * @param {typeof sap.ui.model.FilterOperator} FilterOperator 
 * @param {typeof sap.m.MessageBox} MessageBox 
 */
function (BaseController, JSONModel, History, formatter, Filter, FilterOperator, MessageBox) {
    "use strict";

    return BaseController.extend("ps.uiRepMercado.controller.DetalhesComissao", {
        
        isNewObject: false,

        onInit: function () {
            var oComissaoModel = new JSONModel({
                delay: 0,
                isEditMode: true
            });
            this.getRouter().getRoute("detalhesComissao").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oComissaoModel, "editComissaoModel");
        },
        
        onPageNavButtonPress: function () {
            history.go(-1);
        },

        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").idComissao;
            var sPath = "";
            this.getView().byId("txtDescComissao").setShowValueStateMessage(false);
            this.getView().byId("txtDescComissao").setValueState(sap.ui.core.ValueState.None);
            if (sObjectId !== "New") {
                this.isNewObject = false;
                sPath = this.getView().getModel().createKey("/Comissoes", {
                    ID: sObjectId
                });
                
                this.getView().bindObject({
                    path: sPath
                });
            }else{
                this.isNewObject = true;
                this._initiateNewComissao();
            }
        }, 

        _initiateNewComissao: function(){
            var oModel = this.getView().getModel();
            oModel.createEntry("/Comissoes", {
                groupId: "createGroup",
                properties: {},
                success: function(oData){
                    var sPath = oModel.createKey("/Comissoes", {
                        ID: oData.ID
                    });
                    this.getView().bindObject({
                        path: sPath
                    });
                }.bind(this),
                error: function(oError){
                    var oErrorMsg = JSON.parse(oError.responseText);
					MessageBox.error(oErrorMsg.error.message.value);
                }
            })
        },

        onDescChange: function(oEvent){
            var sNewDesc = oEvent.getParameter("newValue");
            var sPath = this.getView().getBindingContext().getPath();
            this.getView().getModel().setProperty(sPath + "/descricao", sNewDesc);
        },

        onCancel: function () {
            if(this.isNewObject){
                this.getView().getModel().remove(this.getView().getBindingContext().getPath());
            }
            this.getView().getModel().resetChanges();
            history.go(-1);
        },     

        onSaveButtonPress: function(){
            if(this._validateFields()){
                this.getView().getModel().submitChanges();
                history.go(-1);
            }
        },

        _validateFields: function(){
            var sPath = this.getView().getBindingContext().getPath();
            var sDesc = this.getView().getModel().getProperty(sPath + "/descricao");
            var bValid = true;
            if(sDesc !== undefined && sDesc !== null && sDesc.trim() !== ""){
                this.getView().byId("txtDescComissao").setShowValueStateMessage(false);
                this.getView().byId("txtDescComissao").setValueState(sap.ui.core.ValueState.None);
                bValid = bValid && true;
            }else{
                this.getView().byId("txtDescComissao").setShowValueStateMessage(true);
                this.getView().byId("txtDescComissao").setValueState(sap.ui.core.ValueState.Error);
                this.getView().byId("txtDescComissao").setValueStateText(this.getView().getModel("i18n").getResourceBundle().getText("noDescriptionMsg"));
                bValid = bValid && false;
            }
            return bValid;
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
            var sComissaoPath = this.getView().getBindingContext().getPath();
            if(oEvent.getParameter("selectedItem")){
                var sReguladorPath = oEvent.getParameter("selectedItem").getBindingContext("reguladoresModel").getPath();
                var oRegulador = this.getView().getModel("reguladoresModel").getProperty(sReguladorPath);
                this.getView().getModel().setProperty(sComissaoPath + "/regulador_ID", oRegulador.ID);
                if(this.isNewObject){
                    this.getView().getModel().setProperty(sComissaoPath + "/regulador/descricao", oRegulador.descricao);
                }
            }else{
               this.getView().getModel().setProperty(sComissaoPath + "/regulador_ID", null);
                if(this.isNewObject){
                    this.getView().getModel().setProperty(sComissaoPath + "/regulador/descricao", "");
                } 
            }
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