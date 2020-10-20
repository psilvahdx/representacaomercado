sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"sap/base/util/ObjectPath"
], function (JSONModel, Device, ObjectPath) {
	"use strict";

	return {

		createDeviceModel : function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createFLPModel : function () {
			var fnGetUser = ObjectPath.get("sap.ushell.Container.getUser"),
				bIsShareInJamActive = fnGetUser ? fnGetUser().isJamActive() : false,
				oModel = new JSONModel({
					isShareInJamActive: bIsShareInJamActive
				});
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
        },
        
        //
        createFilterModel: function () {
			return new JSONModel({
				temas: {
					tema: "",
                    status: [],
                    comissoes: []
				},
                usuarios:{
                    ID:"",
                    matricula:"",
                    nome:"",
                    cargo:"",
                    perfil: [],
                    calssficCargo: [],
                    comissoes: []
                }
            });
        },

        createUserModel: function(){
            return new JSONModel({
				userLog: {}
            });
        },

        createAvaliacaoSelectedModel: function(){
            return new JSONModel({
                classifProcess:{
                    text:"",
                    value: ""
                },
                impactoOper:{
                    text:"",
                    value: ""
                },
                esforco:{
                    text:"",
                    value: ""
                },
                tempoAdaptacao:{
                    text:"",
                    value: ""
                },
                amadurecimentoTema:{
                    text:"",
                    value: ""
                },
                impactoFinanceiro:{
                    text:"",
                    value: ""
                },
                origem:{
                    text:"",
                    value: ""
                }
            });
        }

	};

});