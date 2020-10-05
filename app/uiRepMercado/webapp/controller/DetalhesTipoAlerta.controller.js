/* eslint-disable no-undef */
/* eslint-disable @sap/ui5-jsdocs/no-jsdoc */
sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, History, formatter, MessageBox) {
    "use strict";

    return BaseController.extend("ps.uiRepMercado.controller.DetalhesTipoAlerta", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                busy: false,
                delay: 0,
                isEditMode: true
            });
            this.getRouter().getRoute("detalhesTipoAlerta").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detTipoAlertaView");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */
        _onPageNavButtonPress: function (oEvent) {
            history.go(-1);
        },

        onCancel: function (oEvent) {
            var oViewModel = this.getView().getModel("detTipoAlertaView");
            oViewModel.setProperty("/isEditMode", true);            
            this.initializeValidator();
            history.go(-1);
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").idTipoAlerta,
                oObject = this.getModel("userLogModel").getData();

            if (oObject.userLog.userProfile_ID !== "ADM") {
                this.getRouter().navTo("temasList");
            } else {

                this.initializeValidator();
                if (sObjectId !== "New") {
                    this._bindView("/TiposAlerta('" + sObjectId + "')", sObjectId);
                }
                else {
                    
                    this.getView().setModel(new JSONModel(this.getTipoAlertaTemplate()), "EditTipoAlertaModel");

                }

            }

        },

        initializeValidator: function () {

            var txtTipoAlerta = this.byId("txtTipoAlerta");
            txtTipoAlerta.setValueState("None");            
        },

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
        _bindView: function (sObjectPath, sIdTipoAlerta) {
            var oModel = this.getModel(),
                that = this,
                vIdTipoAlerta = sIdTipoAlerta,
                oViewModel = this.getModel("detTipoAlertaView");

            oModel.read(sObjectPath, {                
                success: function (oData) {
                    var oEdiTiopoAlertaModel = new JSONModel(oData);
                    that.getView().setModel(oEdiTiopoAlertaModel, "EditTipoAlertaModel");                   
                },
                error: function (oError) {
                   
                }
            });

        },        

        getViewEntity: function () {
            var oObject = this.getView().getModel("EditTipoAlertaModel").getData(),
                oView = this.getView(),
                oParams = {
                    ID: oObject.ID,
                    descricao: oObject.descricao,                 
                    perfil_ID: oObject.perfil_ID? oObject.perfil_ID: null
                };

            return oParams;
        },

        getTipoAlertaTemplate: function () {

            var oParams = {
                ID: "",
                descricao: "",     
                perfil_ID: "",
                peril: {
                    ID: "",
                    descricao: ""
                }

            };

            return oParams;
        },

        _validateField: function (fieldName) {

            var oControl = this.getView().byId(fieldName);
            var value;

            if (fieldName.substring(0, 3) === "sel") {
                value = oControl.getSelectedKey();
                if (value === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(this.geti18nText("campo_obrigatorio_txt"));
                    sap.m.MessageToast.show(this.geti18nText("campo_obrigatorio_msg"));
                    return false;
                }
            } else {
                value = oControl.getValue();
                if (value === "") {
                    oControl.setValueState("Error");
                    oControl.setValueStateText(this.geti18nText("campo_obrigatorio_txt"));
                    sap.m.MessageToast.show(this.geti18nText("campo_obrigatorio_msg"));
                    return false;
                }
            }
            oControl.setValueState("None");
            return true;
        },

        validaInformacoes: function () {

            var isValid = true;

            if (!this._validateField("txtTipoAlerta"))
                isValid = false;            

            return isValid;
        },        

        onSaveButtonPress: function (oEvent) {

            var that = this,
                oParams = this.getViewEntity(),
                oViewModel = this.getModel("detTipoAlertaView"),
                entitySet = "/TiposAlerta";

            if (this.validaInformacoes()) {
                oViewModel.setProperty("/busy", true);
                if (oParams.ID === "") {
                    //Novo Tipo de Alerta
                    this.saveTipoAlerta(oParams, oViewModel, entitySet);
                }
                else {
                    //Atualiza Tipo de Alerta
                    this.updateTipoAlerta(oParams, oViewModel, entitySet);
                }
            }


        },

        saveTipoAlerta: function (oParams, oViewModel, entitySet) {
            var sMessage = "",
                oModel = this.getModel(),
                that = this;

            this.sendCreateTipoAlertaRequest(entitySet, oParams);

        },

        updateTipoAlerta: function (oParams, oViewModel, entitySet) {
            var sMessage = "",
                that = this;

            entitySet = entitySet + "(ID='" + oParams.ID + "')";
            this.sendUpdateTipoAlertaRequest(entitySet, oParams);


        },

        sendCreateTipoAlertaRequest: function (entitySet, oParams) {

            var oModel = this.getModel(),
                oViewModel = this.getModel("detTipoAlertaView"),
                that = this;

            oModel.create(entitySet, oParams, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_tipo_alerta"));                   
                    oViewModel.setProperty("/busy", false);                    
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tipo_alerta"));
                    oViewModel.setProperty("/busy", false);
                    oModel.refresh();
                }
            });
        },

        sendUpdateTipoAlertaRequest: function (entitySet, oParams) {

            var oModel = this.getModel(),
                oViewModel = this.getModel("detTipoAlertaView"),
                that = this;

            oModel.update(entitySet, oParams, {
                success: function (oData) {
                    that.getOwnerComponent()._genericSuccessMessage(that.geti18nText("sucesso_salvar_tipo_alerta"));
                    oViewModel.setProperty("/busy", false);                   
                },
                error: function (oError) {
                    that.getOwnerComponent()._genericErrorMessage(that.geti18nText("erro_salvar_tipo_alerta"));
                    oViewModel.setProperty("/busy", false);
                    oModel.refresh();
                }
            });

        }        
    });
});