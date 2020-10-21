const cds = require('@sap/cds');
const dateFormat = require('dateformat');
const SapCfAxios = require('sap-cf-axios').default;
const destination = SapCfAxios('ODATA_COLABORADORES');
const axios = require('axios');
const qs = require('qs');
const SequenceHelper = require("./lib/SequenceHelper");
module.exports = cds.service.impl(async (service) => {
    const db = await cds.connect.to("db");
    const {
        Temas,
        Historico,
        AlertasUsuario,
        EventosAlerta,
        AppSettings
    } = service.entities;

    service.on("atualizaStatusTemas", async (context) => {

        let nTemasAtualizados = 0;
        let oLog = {
            ID: 0,
            status: "",
            message: ""
        };
        let aHist = [];

        const aTemas = await cds.read(Temas);

        for (let i = 0; i < aTemas.length; i++) {
            const tema = aTemas[i];

            if (tema.status !== 4) {
                //Tema em aberto, verifica data da ultima atualização
                if (tema.ultimoRegistro) {
                    const dToday = new Date();
                    const dUltimoRegistro = new Date(tema.ultimoRegistro);
                    const diffTime = Math.abs(dUltimoRegistro - dToday);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    console.log("Ultima Atualizacao:", tema.ultimoRegistro)
                    console.log("Qtd Dias sem atualizacao:", diffDays)

                    if (diffDays >= 90) {
                        //Alera Status para Sem Atualização
                        const dUltimoRegistro = dateFormat(dToday, "isoDateTime");
                        console.log("Atualizando Tema ID:", tema.ID);
                        const affectedRows = await service.update(Temas).set({
                            status_ID: 2,
                            ultimoRegistro: dUltimoRegistro
                        }).where({
                            ID: tema.ID
                        });
                        console.log("Tema Atualizado");
                        nTemasAtualizados = nTemasAtualizados + 1;
                        console.log("affectedRows:", affectedRows);
                        //Histórico
                        const oHist = JSON.parse(JSON.stringify(tema));
                        delete oHist.ID;

                        oHist.idTema = tema.ID;
                        oHist.status_ID = 2;
                        oHist.ultimoRegistro = dToday;
                        oHist.statusAlterado = "Status alterado pelo sistema após 90 dias";

                        console.log("Atualizando Histórico");
                        const aRows = await service.create(Historico).entries(oHist);
                        console.log("Historico Atualizado", aRows);

                    }
                }

            }
        }

        //Atualiza Historico
        if (aHist.length > 0) {
            console.log("Atualizando Histórico");
            const aRows = await service.create(Historico).entries(aHist);
            console.log("Historico Atualizado", aRows);

        }

        oLog.message = `Quantidade de temas atualizados: ${nTemasAtualizados}`;

        context.reply(oLog);
    });

    service.before("CREATE", Historico, async (context) => {
        const histTemaId = new SequenceHelper({
            db: db,
            sequence: "HISTORICO_ID",
            table: "REPRESENTACAOMERCADO_DB_HISTORICO",
            field: "ID"
        });

        context.data.ID = await histTemaId.getNextNumber();
        if (!context.data.ID) {
            context.data.ID = 1;
        }
        context.data.userAlteracao_ID = null;
        console.debug('Historico ID:', context.data.ID)

    });

    //disparaEmailsAlerta
    service.on("disparaEmailsAlerta", async (context) => {
        let oLog = {
            ID: 0,
            status: "",
            message: ""
        };
        const dToday = new Date();
        let nTotalEnvios = 0,
            aCalendarios = await cds.read(AlertasUsuario),
            aEventos = await cds.read(EventosAlerta).where({
                concluido: false,
                enviaEmail: true
            });

        for (let i = 0; i < aEventos.length; i++) {
            const evento = aEventos[i];
            console.log("Lendo Evento", evento.ID);
            const dtAlerta = new Date(evento.dtInicio.substring(0, 4) + "/" +
                evento.dtInicio.substring(5, 7) + "/" +
                evento.dtInicio.substring(8, 10));

            console.log("Data Execucao", dToday.toLocaleDateString());
            console.log("Data Evento", dtAlerta.toLocaleDateString());

            //Recupera Calendario a partir do evento
            var oCalendarioUser = aCalendarios.find(c => c.ID === evento.alertaUsuario_ID);

            if (oCalendarioUser) {

                //valida se data de envio é a data em que o programa esta executando
                if (dtAlerta.toLocaleDateString() === dToday.toLocaleDateString()) {
                    console.log("Evento ocorre na data de Hoje", evento.ID);
                    //Evento esta relcionado com Status do tema?
                    if (evento.statusTemas && evento.statusTemas.trim() !== "") {
                        let aStatusTema = evento.statusTemas.split("|");
                        console.log("Enviar email para temas com os Status", aStatusTema);

                        var aTemasRepresentante = await cds.read(Temas).where({
                            representante_ID: oCalendarioUser.usuario_ID,
                            status_ID: aStatusTema
                        });
                        if (aTemasRepresentante && aTemasRepresentante.length > 0) {

                            try {
                                //Dispara Email do evento para o Usuário
                                const emailTemasEnviado = await enviaEmailEvento(evento, oCalendarioUser.usuario_ID);

                                if (emailTemasEnviado) {
                                    nTotalEnvios++;
                                    //Atualiza Evento para Concluído
                                    const evntTemas = await cds.update(EventosAlerta).set({
                                        concluido: true
                                    }).where({
                                        ID: evento.ID
                                    });
                                }

                            } catch (error) {
                                console.log("Erro Envio Email ID Evento:", evento.ID);
                            }


                        }


                    } else {

                        try {
                            //Dispara Email do evento para o Usuário
                            const emailEnviado = await enviaEmailEvento(evento, oCalendarioUser.usuario_ID);

                            if (emailEnviado) {
                                nTotalEnvios++;
                                //Atualiza Evento para Concluído
                                const evnt = await cds.update(EventosAlerta).set({
                                    concluido: true
                                }).where({
                                    ID: evento.ID
                                });
                            }
                        } catch (error) {
                            console.log("Erro Envio Email ID Evento:", evento.ID);

                        }



                    }

                }
            }

        }

        oLog.message = `Quantidade de emails enviados: ${nTotalEnvios}`;
        context.reply(oLog);

    });

    async function enviaEmailEvento(oEvento, sMatricula) {

        let oAppSettings = {};
        const aAppSettings = await cds.read(AppSettings).where({
            ID: 2
        });
        if (aAppSettings.length > 0) {
            oAppSettings = aAppSettings[0];
        }


        var token = await getBarerToken(oAppSettings).then((token) => {
            return token;
        });
        console.log("token recuperado:", token);
        console.log("conteudo email", oEvento.conteudo);
        var oEmailContent = "";
        if (oEvento.conteudo) {
            oEmailContent = oEvento.conteudo.replace("\"", "'");
        }

        let response = await getEmailColaborador(sMatricula).then(colaborador => {

            //colaborador.Email_Funcionario
            let aEmails = ["paulosantos.silva@portoseguro.com.br"]; //colaborador.Email_Funcionario
            if (colaborador.Login_Funcionario === "F0121544") {
                aEmails.push("odair.matos@portoseguro.com.br");
            }
            //Evia Email
            console.log("Colaborador:", colaborador);
            return axios({
                method: 'post',
                url: `${oAppSettings.urlApi}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    from: "noreplay@portoseguro.com.br",
                    to: aEmails,
                    subject: oEvento.descricao,
                    htmlMessage: oEmailContent

                }

            }).then(function (response) {
                console.log("email enviado com sucesso");
                return true;
            }).catch(function (error) {
                console.log("Erro no envio de email:", error.message);
            });

        });

        return response;
    };

    async function getEmailColaborador(sMatricula) {


        let sPath = `/xsodata/workflows.xsodata/EmpregadosSet('${sMatricula}')`,
            oColaborador = {};

        try {
            const response = await destination({
                method: "get",
                url: sPath,
                headers: {
                    "content-type": "application/json"
                },
                params: {
                    "$select": "Login_Funcionario,Email_Funcionario"
                }
            });

            console.log("ODATA_COLABORADORES_DESTINATION_RESPONSE", response.data);

            oColaborador = response.data.d;

        } catch (error) {

            console.log("ERRO ODATA_COLABORADORES_DESTINATION", error.message);
        }

        return oColaborador;

    };

    async function getBarerToken(oAppSettings) {
        try {

            var ret_token = await axios({
                method: 'post',
                url: oAppSettings.urlToken,
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded"
                },
                data: qs.stringify({
                    client_id: oAppSettings.clientID,
                    client_secret: oAppSettings.clientSecret,
                    grant_type: "client_credentials"
                })
            }).then(function (response) {
                return response.data.access_token;
            }).catch(function (error) {
                console.log("Erro ao Buscar Token");
            });
        } catch (e) {
            console.log("Erro ao Buscar Token")
        }
        return ret_token;
    };


});