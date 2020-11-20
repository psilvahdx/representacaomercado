const cds = require('@sap/cds');
const dateFormat = require('dateformat');
const SapCfAxios = require('sap-cf-axios').default;
const destination = SapCfAxios('ODATA_COLABORADORES');
const axios = require('axios');
const qs = require('qs');
const hana = require('@sap/hana-client');
const SequenceHelper = require("./lib/SequenceHelper");
//require('@sap/xsenv').loadEnv();
module.exports = cds.service.impl(async (service) => {
    const bancoColaboradores = hana.createConnection();
    const conn_parms_tcp_test = {
        serverNode: process.env.VAR_BDCOLAB_SERVERNODE, 
        encrypt: true,
        sslValidateCertificate: false,
        uid: process.env.VAR_BDCOLAB_UID,
        pwd: process.env.VAR_BDCOLAB_PWD
    };

    await bancoColaboradores.connect(conn_parms_tcp_test, function (err) {
        if (err) throw err;
        console.log("CONNECTOU")
    });
    const db = await cds.connect.to("db");
    const {
        Temas,
        Historico,
        AlertasUsuario,
        EventosAlerta,
        AppSettings,
        TemasFechamentoMensal,
        Usuarios
    } = service.entities;

    service.on("atualizaStatusTemas", async (context) => {
        console.log("chamou Atualiza Status temas");
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
                                if (evento.conteudo) {
                                    const emailTemasEnviado = await enviaEmailEvento(evento, oCalendarioUser.usuario_ID);

                                    if (emailTemasEnviado) {
                                        nTotalEnvios++;
                                        //Atualiza Evento para Concluído
                                        console.log("Atualiza Evento para Concluido ID:", evento.ID);
                                        const evntTemas = await cds.update(EventosAlerta).set({
                                            concluido: true
                                        }).where({
                                            ID: evento.ID
                                        });
                                        console.log("Evento Atualizado com Sucesso:", evento.ID);
                                    }
                                }

                            } catch (error) {
                                console.log("Erro Envio Email ID Evento:", evento.ID);
                            }


                        }


                    } else {

                        try {
                            //Dispara Email do evento para o Usuário
                            if (evento.conteudo) {

                                const emailEnviado = await enviaEmailEvento(evento, oCalendarioUser.usuario_ID);

                                if (emailEnviado) {
                                    nTotalEnvios++;
                                    //Atualiza Evento para Concluído
                                    console.log("Atualiza Evento para Concluido ID:", evento.ID);
                                    const evnt = await cds.update(EventosAlerta).set({
                                        concluido: true
                                    }).where({
                                        ID: evento.ID
                                    });
                                    console.log("Evento Atualizado com Sucesso:", evento.ID);
                                }
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

    //Fechamento Mensal
    service.on("criaFechamentoMensal", async (context) => {
        let oLog = {
            ID: 0,
            status: "",
            message: ""
        };
        var aFechamentoMes = [],
            aTemas = await cds.read(Temas);
        var vToday = new Date(),
            vDtFechamento = new Date(),
            isFechamentoManual = false;

        //console.log("body:",context.data)


        let sPeriodoDe = context.data.periodo,
            sPeriodoAte = context.data.periodo;
        sPeriodoDe = sPeriodoDe ? `${sPeriodoDe}-01` : null;
        sPeriodoAte = sPeriodoAte ? `${sPeriodoAte}-28` : null; //data de Fechamento sempre será o primeiro dia do mês


        if (sPeriodoDe) {
            var aFechamentoPeriodo = await SELECT.from(TemasFechamentoMensal).where({
                dtFechamento: {
                    between: sPeriodoDe,
                    and: sPeriodoAte
                }
            });
            console.log("Registros no Período:", aFechamentoPeriodo.length);
            isFechamentoManual = true;
            vDtFechamento = dateFormat(sPeriodoDe, "isoUtcDateTime");
            console.log("Data Fechamento Manual", vDtFechamento);
        }


        //Se Execução acontece no primeiro dia do mês
        if (vToday.getDate() === 1 || isFechamentoManual) {

            if (!isFechamentoManual) {
                //Seta Inicio do Mês anterior ao mês atual, caso executado via job no primeiro dia do mês
                vDtFechamento.setDate(2); //Começo do Mês
                vDtFechamento.setMonth(vDtFechamento.getMonth() - 1); //Mês anterior
            }


            for (let i = 0; i < aTemas.length; i++) {
                const element = aTemas[i];
                element.ultimoRegistro = dateFormat(vDtFechamento, "isoUtcDateTime");
                var oTema = {
                    idTema: element.ID,
                    status_ID: element.status_ID,
                    criticidade_ID: element.criticidade_ID,
                    regulador_ID: element.regulador_ID,
                    primeiroRegistro: element.primeiroRegistro,
                    ultimoRegistro: element.ultimoRegistro,
                    dataUltimaReuniao: element.dataUltimaReuniao,
                    representante_ID: element.representante_ID,
                    comissao_ID: element.comissao_ID,
                    diretorGeral: element.diretorGeral,
                    diretorExecutivo: element.diretorExecutivo,
                    dtFechamento: dateFormat(vDtFechamento, "isoUtcDateTime")
                }

                aFechamentoMes.push(oTema);

                if (aFechamentoMes.length >= 500) {

                    console.log("Atualizando Fechamento Mensal");
                    const aRows = await service.create(TemasFechamentoMensal).entries(aFechamentoMes);
                    //console.log("Fechamento Mensal", aRows);
                    aFechamentoMes = [];
                }

            }

            if (aFechamentoMes.length > 0) {

                console.log("Atualizando Fechamento Mensal");
                const aRows = await service.create(TemasFechamentoMensal).entries(aFechamentoMes);
                //console.log("Fechamento Mensal", aRows);

            }
            oLog.message = `Fechamento Realizado para: ${vDtFechamento}`;
        } else {
            oLog.message = `Não há Registros para atualizar`;
        }


        context.reply(oLog);



    });

    service.on("atualizaUsuarios", async (context) => {

        let oLog = {
            ID: 0,
            status: "",
            message: ""
        },
            nAttSucesso = 0,
            nErroAtt = 0;

        const aUsers = await cds.read(Usuarios);

        for (let i = 0; i < aUsers.length; i++) {
            const usuario = aUsers[i];


            let oColab = await getColaborador(usuario.ID).then(colaborador => {

                return colaborador;

            });

            if (oColab) {
                try {

                    console.log("Atualiza Dados Colaborador:", usuario.ID);
                    const evnt = await cds.update(Usuarios).set({
                        diretorGeral: oColab.Nome_Vice_Presidente,
                        diretorExecutivo: oColab.Nome_Superintendente,
                        cargo: oColab.Nome_Cargo_Funcionario
                    }).where({
                        ID: usuario.ID
                    });
                    console.log("Colaborador Atualizado com Sucesso:", usuario.ID);
                    nAttSucesso++;

                } catch (error) {
                    console.log("Erro ao Atualizar Colaborador:", usuario.ID);
                    console.log("Erro:", error);
                    nErroAtt++;
                }

            }

        }

        oLog.message = `Registros Atualizados:(${nAttSucesso}) Registros com Erro:(${nErroAtt})`

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
        //console.log("conteudo email", oEvento.conteudo);
        var oEmailContent = "";
        if (oEvento.conteudo) {
            oEmailContent = oEvento.conteudo.replace("\"", "'");
        }

        let response = await getColaborador(sMatricula).then(colaborador => {

            if (colaborador && colaborador.Email_Funcionario) {

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
            } else {
                return false;
            }

        });

        return response;
    }

    async function getColaborador(sMatricula) {

        let oColaborador = {},
            oAppSettings = {},
            vApi = "1";

        console.log("DataBase Colaboradores", sMatricula);

        try {
            vApi = process.env.VAR_API_HIERARQUIA;
            if (!vApi) {
                vApi = "1";
            }
        } catch (error) {
            vApi = "1";
            console.log("Erro na Leitura VAR_API_HIERARQUIA");
        }

        if (vApi === "1") {

            var resPromisse = new Promise(function (resolve, reject) {
                bancoColaboradores.exec(`SELECT *
            FROM DDCE7AB5E0FC4A0BB7674B92177066FB."EmpregadoDoSenior.Empregado" as Empregado
            WHERE Empregado."Login_Funcionario" = '${sMatricula}'`,
                    function (err, result) {
                        if (err) reject(err);
                        resolve(result);
                    });
            }.bind(this));

            var response = await resPromisse.then(function (result) {
                return result
            }).catch(function (err) {
                //context.reject(400, err);
                console.log("ERRO DataBase Colaboradores", err);
            });

            if (response) {
                oColaborador = response[0];
            }
        } else {

            //Busca dados Colaborador API Hierarquia - REST
            const aAppSettings = await cds.read(AppSettings).where({
                ID: 1
            });
            if (aAppSettings.length > 0) {
                oAppSettings = aAppSettings[0];
            }

            var token = await getBarerToken(oAppSettings).then((token) => {
                return token;
            });
            console.log("token recuperado:", token);

            const ret_api_hierarquia = await
                axios({
                    method: 'get',
                    url: `${oAppSettings.urlApi}?login=${sMatricula}`,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).then(function (response) {
                    console.log("Chamou API de Hierarquia com Token?: ", response.data);
                    return response.data;
                }).catch(function (error) {
                    console.log("Erro na Busca de Hierarquia:", error);
                });

            //Complementa dados Usuário com retorno Api de Hierarquia
            if (ret_api_hierarquia && ret_api_hierarquia.nomeColaborador) {
                oColaborador.Login_Funcionario = sMatricula;
                oColaborador.Nome_Funcionario = ret_api_hierarquia.nomeColaborador;
                oColaborador.Nome_Cargo_Funcionario = ret_api_hierarquia.cargo;
                oColaborador.Email_Funcionario = ret_api_hierarquia.emailFuncionario;
                oColaborador.Nome_Vice_Presidente = ret_api_hierarquia.diretor;
                oColaborador.Nome_Gerente = ret_api_hierarquia.gerencia;
                oColaborador.Nome_Superintendente = ret_api_hierarquia.superintendencia;
                oColaborador.Cadastro_Coordenador = ret_api_hierarquia.matriculaCoordenador;
                oColaborador.Nome_Coordenador = ret_api_hierarquia.coordenador;
                oColaborador.Nome_Area_Funcionario = ret_api_hierarquia.departamento;
            }

        }

        /*let sPath = `/xsodata/workflows.xsodata/EmpregadosSet('${sMatricula}')`,
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

            //console.log("ODATA_COLABORADORES_DESTINATION_RESPONSE", response.data);

            oColaborador = response.data.d;

        } catch (error) {

            console.log("ERRO ODATA_COLABORADORES_DESTINATION", error.message);
        }*/

        return oColaborador;

    }

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
    }


});