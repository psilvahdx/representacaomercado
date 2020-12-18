const {
    serve
} = require('@sap/cds');
const cds = require('@sap/cds');
const SapCfAxios = require('sap-cf-axios').default;
const destination = SapCfAxios('ODATA_COLABORADORES');
const axios = require('axios');
const qs = require('qs');
const dateFormat = require('dateformat');
const hana = require('@sap/hana-client');
//require('@sap/xsenv').loadEnv();

const SequenceHelper = require("./lib/SequenceHelper");
module.exports = cds.service.impl(async (service) => {

    const bancoColaboradores = hana.createConnection();
    const conn_parms_tcp_test = {
        serverNode: process.env.VAR_BDCOLAB_SERVERNODE, 
        encrypt: true,
        sslValidateCertificate: false,
        uid: process.env.VAR_BDCOLAB_UID,
        pwd: process.env.VAR_BDCOLAB_PWD
    };   

    await bancoColaboradores.connect(conn_parms_tcp_test);
    const db = await cds.connect.to("db");
    const {
        Temas,
        Historico,
        Usuarios,
        ComissoesRepresentante,
        UsersExtensions,
        Perfis,
        PerfilAcoes,
        Comissoes,
        TemasPorRegulador,
        Reguladores,
        CargoClassificacoes,
        TiposAlerta,
        AlertasUsuario,
        EventosAlerta,
        Criticidades,
        TemasPorCriticidade,
        ComparativoComTemas,
        Status,
        TemasFechamentoMensal,
        AppSettings
    } = service.entities;


    //Before Events
    service.before("READ", Temas, async (req) => {
        let aUsers = [],
            usuario = {},
            aComissoesUsuario = [],
            acomissoesIds = [],
            xprComissoesIds = {};

        const {
            SELECT
        } = req.query

        //console.log("Query>>>>",req.query);

        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({
                usuario_ID: usuario.ID
            });
            acomissoesIds = aComissoesUsuario.map(x => x.comissao_ID);
            if (acomissoesIds.length > 0) {
                const inComissoesID = `comissao_ID in (${acomissoesIds.join(',')})`;
                //console.log("Comissoes ID", inComissoesID);
                xprComissoesIds = cds.parse.expr(inComissoesID);
            }
        }

        switch (usuario.perfil_ID) {
            case "REP":

                if (SELECT.where) {
                    //Realizou filtro na tela
                    //console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where.push(...['and', '(', xprComissoesIds, ')']);
                        // console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where = [{
                                ref: ['status_ID']
                            },
                            '<>',
                            {
                                val: 4
                            }, 'and', '(', xprComissoesIds, ')'
                        ];

                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }

                }

                break;
            case "VP_DIR":
                //visualização dos temas e painéis de sua responsabilidade
                if (SELECT.where) {
                    //Realizou filtro na tela
                    // console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where.push(...['and', '(', xprComissoesIds, 'or',
                            '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', ')'
                        ]);
                        // console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where.push(...['and', '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')'
                        ]);
                        //console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where = [{
                                ref: ['status_ID']
                            },
                            '<>',
                            {
                                val: 4
                            }, 'and', '(', xprComissoesIds,
                            'or',
                            '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', ')'
                        ];

                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where = ['(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', 'and',
                            {
                                ref: ['status_ID']
                            }, '<>', {
                                val: 4
                            }
                        ]; //Somente Temas em Aberto
                    }


                }

                break;
            case "ADM":
            case "PRES":
                //console.log("Adm/Pres", SELECT.where);
                break;
            default:
                req.reject(404, "Usuário não autorizado");
                break;
        }


    });

    service.before("READ", TemasFechamentoMensal, async (req) => {
        let aUsers = [],
            usuario = {},
            aComissoesUsuario = [],
            acomissoesIds = [],
            xprComissoesIds = {};

        const {
            SELECT
        } = req.query

        //Incrementa Limite de resultados (Exibição de Indicadores)
        if (SELECT.limit) {
            SELECT.limit.rows.val = 30000000;
        }

        //console.log("Query>>>>",req.query);

        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({
                usuario_ID: usuario.ID
            });
            acomissoesIds = aComissoesUsuario.map(x => x.comissao_ID);
            if (acomissoesIds.length > 0) {
                const inComissoesID = `comissao_ID in (${acomissoesIds.join(',')})`;
                //console.log("Comissoes ID", inComissoesID);
                xprComissoesIds = cds.parse.expr(inComissoesID);
            }
        }

        switch (usuario.perfil_ID) {
            case "REP":

                if (SELECT.where) {
                    //Realizou filtro na tela
                    //console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where.push(...['and', '(', xprComissoesIds, ')']);
                        // console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where = [{
                                ref: ['status_ID']
                            },
                            '<>',
                            {
                                val: 4
                            }, 'and', '(', xprComissoesIds, ')'
                        ];

                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }

                }

                break;
            case "VP_DIR":
                //visualização dos temas e painéis de sua responsabilidade
                if (SELECT.where) {
                    //Realizou filtro na tela
                    // console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where.push(...['and', '(', xprComissoesIds, 'or',
                            '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', ')'
                        ]);
                        // console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where.push(...['and', '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')'
                        ]);
                        //console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where = [{
                                ref: ['status_ID']
                            },
                            '<>',
                            {
                                val: 4
                            }, 'and', '(', xprComissoesIds,
                            'or',
                            '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', ')'
                        ];

                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where = ['(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', 'and',
                            {
                                ref: ['status_ID']
                            }, '<>', {
                                val: 4
                            }
                        ]; //Somente Temas em Aberto
                    }


                }

                break;
            case "ADM":
            case "PRES":
                //console.log("Adm/Pres", SELECT.where);
                break;
            default:
                req.reject(404, "Usuário não autorizado");
                break;
        }


    });


    service.before("READ", Historico, async (req) => {
        let aUsers = [],
            usuario = {},
            aComissoesUsuario = [],
            acomissoesIds = [],
            xprComissoesIds = {};

        const {
            SELECT
        } = req.query

        //Incrementa Limite de resultados (Exibição de Indicadores)
        if (SELECT.limit) {
            SELECT.limit.rows.val = 30000000;
        }
        // console.log("Historico Query>>>>",SELECT.limit);

        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
            //busca comissões para o Usuário
            aComissoesUsuario = await cds.read(ComissoesRepresentante).where({
                usuario_ID: usuario.ID
            });
            acomissoesIds = aComissoesUsuario.map(x => x.comissao_ID);
            if (acomissoesIds.length > 0) {
                const inComissoesID = `comissao_ID in (${acomissoesIds.join(',')})`;
                //console.log("Comissoes ID", inComissoesID);
                xprComissoesIds = cds.parse.expr(inComissoesID);
            }
        }

        switch (usuario.perfil_ID) {
            case "REP":

                if (SELECT.where) {
                    //Realizou filtro na tela
                    //console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where.push(...['and', '(', xprComissoesIds, ')']);
                        // console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Representante somente visualiza Temas para as comissões que esta relacionado
                        SELECT.where = [{
                                ref: ['status_ID']
                            },
                            '<>',
                            {
                                val: 4
                            }, 'and', '(', xprComissoesIds, ')'
                        ];

                    } else {
                        //Representante sem Temas e Comissões
                        req.reject(404, "Representante sem Comissões");
                    }

                }

                break;
            case "VP_DIR":
                //visualização dos temas e painéis de sua responsabilidade
                if (SELECT.where) {
                    //Realizou filtro na tela
                    // console.log("BEFORE TEMAS: Where", SELECT.where);

                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where.push(...['and', '(', xprComissoesIds, 'or',
                            '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', ')'
                        ]);
                        // console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where.push(...['and', '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')'
                        ]);
                        //console.log("BEFORE TEMAS: Where Alterado", SELECT.where);
                    }


                } else {
                    //Consulta incial sem Filtros
                    if (acomissoesIds.length > 0) {
                        //Busca por Temas onde o Diretor esta relacionado com alguma Comissão  
                        SELECT.where = [{
                                ref: ['status_ID']
                            },
                            '<>',
                            {
                                val: 4
                            }, 'and', '(', xprComissoesIds,
                            'or',
                            '(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', ')'
                        ];

                    } else {
                        //Diretor não esta em nenhuma comissão, busca por Temas onde esta como Diretor/Diretor Executivo
                        SELECT.where = ['(', {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorGeral']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            'or',
                            {
                                func: 'upper',
                                args: [{
                                    ref: ['diretorExecutivo']
                                }]
                            },
                            'like',
                            {
                                func: 'concat',
                                args: ['\'%\'', {
                                    val: usuario.nome.toUpperCase()
                                }, '\'%\'']
                            },
                            ')', 'and',
                            {
                                ref: ['status_ID']
                            }, '<>', {
                                val: 4
                            }
                        ]; //Somente Temas em Aberto
                    }


                }

                break;
            case "ADM":
            case "PRES":
                //console.log("Adm/Pres", SELECT.where);
                break;
            default:
                req.reject(404, "Usuário não autorizado");
                break;
        }


    });


    service.before("READ", AlertasUsuario, async (req) => {
        let aUsers = [],
            usuario = {};

        const {
            SELECT
        } = req.query;

        //console.log("Alertas Usuario Select >>>>>",SELECT);

        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
        }

        if (!SELECT.where) {
            SELECT.where = [{
                    ref: ['usuario_ID']
                },
                '=',
                {
                    val: usuario.ID
                }
            ];
        }

    });


    service.before("READ", TiposAlerta, async (req) => {
        let aUsers = [],
            usuario = {};

        const {
            SELECT
        } = req.query;

        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            usuario = aUsers[0];
        }

        if (usuario.perfil_ID !== "ADM") {
            if (!SELECT.where) {
                const where = `perfil_ID ='${usuario.perfil_ID}' or perfil_ID = 'null' `;
                const expr = cds.parse.expr(where);
                SELECT.where = expr.xpr;
            }
            //console.log("SELECT.where Tipos Alertas", SELECT.where);
        }



    });


    service.before("CREATE", Temas, async (context) => {
        const temaId = new SequenceHelper({
            db: db,
            sequence: "TEMAS_ID",
            table: "REPRESENTACAOMERCADO_DB_TEMAS",
            field: "ID"
        });
        console.debug('Busca ID')
        context.data.ID = await temaId.getNextNumber();
        console.debug('ID:', context.data.ID)
        console.debug('Dados usuario logado:', context.user)

    });

    service.before("CREATE", Reguladores, async (context) => {
        const reguladorId = new SequenceHelper({
            db: db,
            sequence: "REGULADORES_ID",
            table: "REPRESENTACAOMERCADO_DB_REGULADORES",
            field: "ID"
        });
        context.data.ID = await reguladorId.getNextNumber();

        // console.log("USUARIO >>>>>>>>>", context.user.id);
    });

    service.before("CREATE", Comissoes, async (context) => {
        const comissaoId = new SequenceHelper({
            db: db,
            sequence: "COMISSOES_ID",
            table: "REPRESENTACAOMERCADO_DB_COMISSOES",
            field: "ID"
        });
        context.data.ID = await comissaoId.getNextNumber();
    });

    service.before("READ", Comissoes, async (req) => {

        let usuario = {},
            aUsers = [],
            acomissoesIds = [],
            aComissoesRepresentante = await cds.read(ComissoesRepresentante),
            aComissoesUsuario = [],
            xprComissoesIds = {},
            xprNotComissoesIds = {};

        const {
            SELECT
        } = req.query;

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });

        if (aUsers.length > 0) {
            usuario = aUsers[0];
            //console.log("Usuario:", usuario);
            //busca comissões para o Usuário
            aComissoesUsuario = aComissoesRepresentante.filter(com => {
                return com.usuario_ID === usuario.ID
            });
            /* aComissoesUsuario = await cds.read(ComissoesRepresentante).where({
                 usuario_ID: usuario.ID
             });*/
        }

        switch (usuario.perfil_ID) {
            case "REP":
            case "VP_DIR":
                //VP/Diretor e Representante somente visualiza as comissões que esta relacionado
                acomissoesIds = aComissoesUsuario.map(x => x.comissao_ID);
                if (acomissoesIds.length > 0) {
                    const inComissoesID = `ID in (${acomissoesIds.join(',')})`;
                    //console.log("Comissoes ID", inComissoesID);
                    xprComissoesIds = cds.parse.expr(inComissoesID);
                    if (!SELECT.where) {
                        SELECT.where = xprComissoesIds.xpr;
                    }
                } else {
                    req.reject(400, "Sem Comissões Atribuidas");
                }
                break;
            case "ADM":
                acomissoesIds = aComissoesRepresentante.map(x => x.comissao_ID);
                if (acomissoesIds.length > 0) {

                    const uniqueIds = acomissoesIds.filter((id, index, self) =>
                        index === self.findIndex((t) => (
                            t === id && t === id
                        ))
                    );

                    uniqueIds.sort(function (a, b) {
                        return a - b
                    });

                    const inComissoesIDs = `ID in (${uniqueIds.join(',')})`;
                    const notInComissoesIDs = `ID NOT in (${uniqueIds.join(',')})`;

                    xprComissoesIds = cds.parse.expr(inComissoesIDs);
                    xprNotComissoesIds = cds.parse.expr(notInComissoesIDs);

                    if (SELECT.where) {

                        // console.log("Adm Sel Where", SELECT.where);                       
                        let sQruery = JSON.stringify(SELECT.where);
                        // console.log("Adm Sel Where String", sQruery);
                        if (sQruery.includes('{"ref":["comIndicacao"]},"=",{"val":null}')) {
                            console.log("comIndicacao", null)
                        }
                        if (sQruery.includes('{"ref":["comIndicacao"]},"=",{"val":true}')) {
                            console.log("Com Indicacao")
                            sQruery = sQruery.replace(',"and",{"ref":["comIndicacao"]},"=",{"val":true}', "")
                            SELECT.where = JSON.parse(sQruery);
                            SELECT.where.push(...['and', '(', xprComissoesIds, ')']);

                        }
                        if (sQruery.includes('{"ref":["comIndicacao"]},"=",{"val":false}')) {
                            console.log("Sem Indicacao")
                            sQruery = sQruery.replace(',"and",{"ref":["comIndicacao"]},"=",{"val":false}', "")
                            SELECT.where = JSON.parse(sQruery);
                            SELECT.where.push(...['and', '(', xprNotComissoesIds, ')']);
                        }
                    }
                }
                default:
                    break;
        }


    });

    service.before("DELETE", EventosAlerta, async req => {
        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {
            //Exclui os eventos onde há relação com o Evento Origem
            if (req.data.ID) {
                console.log("Exclui os eventos onde há relação com o Evento Origem", req.data.ID);
                const delEvents = await cds.delete(EventosAlerta).where({
                    eventoOrigem_ID: req.data.ID
                });
                console.log("Eventos excluidos com sucesso", req.data.ID);
            }

        }

    });


    //On Events 
    service.on("READ", Comissoes, async (req, next) => {
        let comissoes = await next();

        const aComissoesRep = await cds.read(ComissoesRepresentante);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        //console.log("aComissoesRep", aComissoesRep.length)
        // console.log("Comissoes NExt", comissoes.length)
        for (let i = 0; i < comissoes.length; i++) {
            var cm = comissoes[i];

            const find = aComissoesComRep.find(f => f.comissao_ID === cm.ID);

            if (find) {
                cm.comIndicacao = true;
            } else {
                cm.comIndicacao = false;
            }

        }


        return comissoes;
    });

    //Temas por Regulador 
    service.on("READ", TemasPorRegulador, async (req) => {

        let aReturn = [],
            aUsers = [];
        let qry = req.query.SELECT.where,
            oUser = {},
            aComissoesRepresentante = await cds.read(ComissoesRepresentante);

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios);
        oUser = aUsers.find(usr => usr.ID === req.user.id);

        var aComissoesUsuario = aComissoesRepresentante.filter(cm => {
            return cm.usuario_ID === oUser.ID
        });

        const aReguladores = await cds.read(Reguladores);
        var aTemas = await cds.read(Temas).where({
            status_ID: [1, 2, 3]
        });

        const tx = service.tx(req);
        var aHistAux = await tx.run(SELECT.from(TemasFechamentoMensal).where(qry));
        console.log("TemasFechamentoMensal:", aHistAux.length);

        //Registro será apresentado por mês. fixa dia como primeiro dia do mês  
        for (let i = 0; i < aHistAux.length; i++) {
            const element = aHistAux[i];
            var vDtReg = new Date(element.ultimoRegistro.substring(0, 4) + "/" +
                element.ultimoRegistro.substring(5, 7) + "/02");
            element.ultimoRegistro = dateFormat(vDtReg, "isoUtcDateTime");
        }

        var aTemasEmAberto = aHistAux;

        var oFilter = req._.odataReq.getQueryOptions() || null;
        if (oFilter) {
            console.log("filtro", oFilter);

            var sFilter = oFilter.$filter;
            var vCurrentMonth = new Date();
            var sCurrentMonth = dateFormat(vCurrentMonth, "isoUtcDateTime");
            sCurrentMonth = sCurrentMonth.substring(0, 7);
            console.log("Mes Atual", sCurrentMonth);

            if (sFilter.includes(sCurrentMonth)) {
                //Temas Em aberto no mês atual 
                console.log("filtro no mes atual");
                var vToday = new Date();
                for (let i = 0; i < aTemas.length; i++) {
                    const element = aTemas[i];
                    element.ultimoRegistro = dateFormat(vToday, "isoUtcDateTime");
                    var oTema = {
                        ID: "4f3e1cc1-a35a-4b2f-8696-0b2000000001", //Dummy
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
                        dtFechamento: element.ultimoRegistro
                    }
                    //Filtra por Perfil de Acesso
                    if (oUser.perfil_ID === "ADM" || oUser.perfil_ID === "PRES") {
                        aTemasEmAberto.push(oTema);
                    } else if (oUser.perfil_ID === "REP" || oUser.perfil_ID === "VP_DIR") {

                        oTema.diretorGeral = oTema.diretorGeral ? oTema.diretorGeral : "";
                        oTema.diretorExecutivo = oTema.diretorExecutivo ? oTema.diretorExecutivo : "";
                        if (oTema.diretorGeral.toUpperCase() === oUser.nome.toUpperCase()) {
                            //console.log("diretor Geral")
                            aTemasEmAberto.push(oTema);
                        } else if (oTema.diretorExecutivo.toUpperCase() === oUser.nome.toUpperCase()) {
                            //console.log("diretor executivo")
                            aTemasEmAberto.push(oTema);;
                        } else {
                            //verifica se comissão esta relacionada com o Usuário logado
                            var found = aComissoesUsuario.find(acr => acr.comissao_ID === oTema.comissao_ID);

                            if (found) {
                                aTemasEmAberto.push(oTema);
                            }

                        }

                    }


                }


            }

        }

        //Recupera lista distinta de datas nos registros recuperados
        var aDates = aTemasEmAberto.filter((tema, index, self) =>
            index === self.findIndex((t) => (
                t.ultimoRegistro.toString() === tema.ultimoRegistro.toString() && t.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            ))
        );
        //Percorre lista de Datas recuperadas
        for (let i = 0; i < aDates.length; i++) {
            const tema = aDates[i];

            var oTemaPorRegulador = {
                ID: ""
            };
            //Agrupa Temas para mês em execução
            var aGroupMonth = aTemasEmAberto.filter(r => {
                return r.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            });
            //Remove duplicados para o mesmo mês, considerando o Id do tema
            var aGroupTemasMonth = aGroupMonth.filter((temaMes, index, self) =>
                index === self.findIndex((t) => (
                    t.idTema === temaMes.idTema && t.idTema === temaMes.idTema
                ))
            );
            //Agrupa por Regulador
            var aReguladoresMes = aGroupTemasMonth.filter((tema, index, self) =>
                index === self.findIndex((t) => (
                    t.regulador_ID === tema.regulador_ID && t.regulador_ID === tema.regulador_ID
                ))
            );
            //Monta objeto de Retorno
            oTemaPorRegulador.ID = tema.ID;
            oTemaPorRegulador.ultimoRegistro = tema.ultimoRegistro;
            var aItens = [];

            for (let z = 0; z < aReguladoresMes.length; z++) {
                const element = aReguladoresMes[z];

                var oItem = {
                    ID: ""
                };

                var aGroupRegulador = aGroupTemasMonth.filter(r => {
                    return r.regulador_ID === element.regulador_ID
                });

                var oReg = aReguladores.find(rg => rg.ID === element.regulador_ID);
                if (oReg) {
                    oItem.descricao = oReg.descricao;
                } else {
                    oItem.descricao = "OUTROS";
                }

                oItem.qtd = aGroupRegulador.length;
                aItens.push(oItem);
            }
            oTemaPorRegulador.itens = aItens;
            aReturn.push(oTemaPorRegulador);
        }


        return aReturn;


    });

    //Temas por Criticidade 
    service.on("READ", TemasPorCriticidade, async (req) => {

        let aReturn = [],
            aUsers = [];
        let qry = req.query.SELECT.where,
            oUser = {},
            aComissoesRepresentante = await cds.read(ComissoesRepresentante);

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios);
        oUser = aUsers.find(usr => usr.ID === req.user.id);

        var aComissoesUsuario = aComissoesRepresentante.filter(cm => {
            return cm.usuario_ID === oUser.ID
        });

        const aCriticidades = await cds.read(Criticidades);
        var aTemas = await cds.read(Temas).where({
            status_ID: [1, 2, 3]
        });

        const tx = service.tx(req);
        var aHistAux = await tx.run(SELECT.from(TemasFechamentoMensal).where(qry));
        console.log("TemasFechamentoMensal:", aHistAux.length);

        //Registro será apresentado por mês. fixa dia como primeiro dia do mês  
        for (let i = 0; i < aHistAux.length; i++) {
            const element = aHistAux[i];
            var vDtReg = new Date(element.ultimoRegistro.substring(0, 4) + "/" +
                element.ultimoRegistro.substring(5, 7) + "/02");
            element.ultimoRegistro = dateFormat(vDtReg, "isoUtcDateTime");
        }

        var aTemasEmAberto = aHistAux;

        var oFilter = req._.odataReq.getQueryOptions() || null;
        if (oFilter) {
            console.log("filtro", oFilter);

            var sFilter = oFilter.$filter;
            var vCurrentMonth = new Date();
            var sCurrentMonth = dateFormat(vCurrentMonth, "isoUtcDateTime");
            sCurrentMonth = sCurrentMonth.substring(0, 7);
            console.log("Mes Atual", sCurrentMonth);

            if (sFilter.includes(sCurrentMonth)) {
                //Temas Em aberto no mês atual 
                console.log("filtro no mes atual");
                var vToday = new Date();
                for (let i = 0; i < aTemas.length; i++) {
                    const element = aTemas[i];
                    element.ultimoRegistro = dateFormat(vToday, "isoUtcDateTime");
                    var oTema = {
                        ID: "3f3e1cc1-a35a-4b2f-8696-0b2000000001", //Dummy
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
                        dtFechamento: element.ultimoRegistro
                    }
                    //Filtra por Perfil de Acesso
                    if (oUser.perfil_ID === "ADM" || oUser.perfil_ID === "PRES") {
                        aTemasEmAberto.push(oTema);
                    } else if (oUser.perfil_ID === "REP" || oUser.perfil_ID === "VP_DIR") {

                        oTema.diretorGeral = oTema.diretorGeral ? oTema.diretorGeral : "";
                        oTema.diretorExecutivo = oTema.diretorExecutivo ? oTema.diretorExecutivo : "";
                        if (oTema.diretorGeral.toUpperCase() === oUser.nome.toUpperCase()) {
                            //console.log("diretor Geral")
                            aTemasEmAberto.push(oTema);
                        } else if (oTema.diretorExecutivo.toUpperCase() === oUser.nome.toUpperCase()) {
                            //console.log("diretor executivo")
                            aTemasEmAberto.push(oTema);;
                        } else {
                            //verifica se comissão esta relacionada com o Usuário logado
                            var found = aComissoesUsuario.find(acr => acr.comissao_ID === oTema.comissao_ID);

                            if (found) {
                                aTemasEmAberto.push(oTema);
                            }

                        }

                    }


                }


            }

        }

        //Recupera lista distinta de datas nos registros recuperados
        var aDates = aTemasEmAberto.filter((tema, index, self) =>
            index === self.findIndex((t) => (
                t.ultimoRegistro.toString() === tema.ultimoRegistro.toString() && t.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            ))
        );
        //Percorre lista de Datas recuperadas
        for (let i = 0; i < aDates.length; i++) {
            const tema = aDates[i];

            var oTemaPorCriticidade = {
                ID: ""
            };
            //Agrupa Temas para mês em execução
            var aGroupMonth = aTemasEmAberto.filter(r => {
                return r.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            });
            //Remove duplicados para o mesmo mês, considerando o Id do tema
            var aGroupTemasMonth = aGroupMonth.filter((temaMes, index, self) =>
                index === self.findIndex((t) => (
                    t.idTema === temaMes.idTema && t.idTema === temaMes.idTema
                ))
            );
            //Agrupa por Criticidade
            var aCriticidadesMes = aGroupTemasMonth.filter((tema, index, self) =>
                index === self.findIndex((t) => (
                    t.criticidade_ID === tema.criticidade_ID && t.criticidade_ID === tema.criticidade_ID
                ))
            );
            //Monta objeto de Retorno
            oTemaPorCriticidade.ID = tema.ID;
            oTemaPorCriticidade.ultimoRegistro = tema.ultimoRegistro;
            var aItens = [];

            for (let z = 0; z < aCriticidadesMes.length; z++) {
                const element = aCriticidadesMes[z];

                var oItem = {
                    ID: ""
                };

                var aGroupCriticidade = aGroupTemasMonth.filter(r => {
                    return r.criticidade_ID === element.criticidade_ID
                });

                var oReg = aCriticidades.find(cr => cr.ID === element.criticidade_ID);
                if (oReg) {
                    oItem.descricao = oReg.descricao;
                } else {
                    oItem.descricao = "Baixo";
                }

                oItem.qtd = aGroupCriticidade.length;
                aItens.push(oItem);
            }
            oTemaPorCriticidade.itens = aItens;
            aReturn.push(oTemaPorCriticidade);
        }

        return aReturn;


    });

    //Comparativo com Temas    
    service.on("READ", ComparativoComTemas, async (req) => {

        const tx = service.tx(req);
        let aReturn = [];
        let qry = req.query.SELECT.where;
        var vToday = dateFormat(new Date(), "isoUtcDateTime");
        var isMesAtual = false;

        let aUsers = []
        aTemasPorPerfil = [],
            oUser = {},
            aComissoesRepresentante = await cds.read(ComissoesRepresentante);

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios);
        oUser = aUsers.find(usr => usr.ID === req.user.id);

        var aComissoesUsuario = aComissoesRepresentante.filter(cm => {
            return cm.usuario_ID === oUser.ID
        });


        const aStatus = await cds.read(Status),
            aTemasSemAtualizacao = await cds.read(Temas).where({
                status_ID: 2
            });

        var aHistAux = await tx.run(SELECT.from(Historico).where(qry));
        console.log("Comarativo com Temas Historico Recuperado:", aHistAux.length);
        //console.log(aHistAux);
        for (let i = 0; i < aHistAux.length; i++) {
            var element = aHistAux[i];
            var vDtReg = new Date(element.ultimoRegistro.substring(0, 4) + "/" +
                element.ultimoRegistro.substring(5, 7) + "/02");
            //Registro será apresentado por mês. fixa dia como primeiro dia do mês             
            element.ultimoRegistro = dateFormat(vDtReg, "isoUtcDateTime");
        }
        //console.log(aHistAux);
        aHistAux = aHistAux.sort(function (a, b) {
            return b.status_ID - a.status_ID
        });
        //console.log("Sort",aHistAux);
        //Recupera lista distinta de Temas nos registros recuperados
        var aHist = aHistAux.filter((tema, index, self) =>
            index === self.findIndex((t) => (
                t.idTema === tema.idTema && t.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            ))
        );
        console.log("Comarativo com Temas Historico Sem Duplicados:", aHist.length);

        //Recupera lista distinta de datas nos registros recuperados
        var aDates = aHist.filter((tema, index, self) =>
            index === self.findIndex((t) => (
                t.ultimoRegistro.toString() === tema.ultimoRegistro.toString() && t.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            ))
        );
        //Percorre lista de Datas recuperadas
        for (let i = 0; i < aDates.length; i++) {
            const tema = aDates[i];

            if (tema.ultimoRegistro.substring(0, 6) === vToday.substring(0, 6)) {
                isMesAtual = true;
            }

            var oTemaPorStatus = {
                ID: ""
            };
            //Agrupa Temas para mês em execução
            var aGroupMonth = aHist.filter(r => {
                return r.ultimoRegistro.toString() === tema.ultimoRegistro.toString()
            });
            //Remove duplicados para o mesmo mês, considerando o Id do tema
            var aGroupTemasMonth = aGroupMonth.filter((temaMes, index, self) =>
                index === self.findIndex((t) => (
                    t.idTema === temaMes.idTema && t.idTema === temaMes.idTema
                ))
            );
            //Agrupa por Status
            var aStatusMes = aGroupTemasMonth.filter((tema, index, self) =>
                index === self.findIndex((t) => (
                    t.status_ID === tema.status_ID && t.status_ID === tema.status_ID
                ))
            );
            //Monta objeto de Retorno
            oTemaPorStatus.ID = tema.ID;
            oTemaPorStatus.ultimoRegistro = tema.ultimoRegistro;
            var aItens = [];

            for (let z = 0; z < aStatusMes.length; z++) {
                const element = aStatusMes[z];

                var oItem = {
                    ID: ""
                };

                var aGroupStatus = aGroupTemasMonth.filter(r => {
                    return r.status_ID === element.status_ID
                });

                var oReg = aStatus.find(cr => cr.ID === element.status_ID);
                if (oReg) {
                    oItem.ID = oReg.ID;
                    oItem.descricao = oReg.descricao;  
                    switch (oReg.ID) {
                        case 1://Novo
                            oItem.sorter = 3;
                            break;
                        case 2://Sem Atualização
                             oItem.descricao = "Estoque de temas sem atualização nos últimos 90 dias"
                             oItem.sorter = 4;
                            break;
                        case 3://Atualizado
                            oItem.sorter = 1;
                            break;
                        case 4://Encerrado
                            oItem.sorter = 2;
                            break;
                        default:
                            break;
                    }                   
                    
                } else {
                    oItem.ID = 1;
                    oItem.descricao = "Novo";
                    oItem.sorter = 3;
                }

                oItem.qtd = aGroupStatus.length;
                aItens.push(oItem);
            }

            oTemaPorStatus.itens = aItens;
            aReturn.push(oTemaPorStatus);
        }
        //Consulta no mês Atual
        //console.log("qry em branco", qry[2].val);
        if (qry[2].val.substring(0, 6) === vToday.substring(0, 6)) {
            isMesAtual = true;
            aReturn.push({
                ID: "cf3e1cc1-a35a-4b2f-8696-0b2000000521",
                ultimoRegistro: qry[2].val,
                itens: [{
                    ID: 2,
                    descricao: "Estoque de temas sem atualização nos últimos 90 dias",//Sem atualização
                    sorter: 4,
                    qtd: 0
                }]
            });
        }

        if (isMesAtual) {


            if (oUser.perfil_ID === "ADM" || oUser.perfil_ID === "PRES") {
                aTemasPorPerfil = aTemasSemAtualizacao;
            } else if (oUser.perfil_ID === "VP_DIR" || oUser.perfil_ID === "REP") {

                for (let idx = 0; idx < aTemasSemAtualizacao.length; idx++) {
                    var tema = aTemasSemAtualizacao[idx];

                    tema.diretorGeral = tema.diretorGeral ? tema.diretorGeral : "";
                    tema.diretorExecutivo = tema.diretorExecutivo ? tema.diretorExecutivo : "";

                    const found = aComissoesUsuario.find(cm => cm.comissao_ID === tema.comissao_ID);
                    if (found) {
                        aTemasPorPerfil.push(tema);
                    } else if (tema.diretorGeral.toUpperCase() === oUser.nome.toUpperCase()) {
                        aTemasPorPerfil.push(tema);
                    } else if (tema.diretorExecutivo.toUpperCase() === oUser.nome.toUpperCase()) {
                        aTemasPorPerfil.push(tema);
                    }
                }

            }

            for (let y = 0; y < aReturn.length; y++) {
                const element = aReturn[y];
                for (let idx = 0; idx < element.itens.length; idx++) {
                    var item = element.itens[idx];
                    if (item.ID === 2) { //Sem atualização no mês atual não considerar data
                        item.qtd = aTemasPorPerfil.length;
                    }
                }
            }

        }

        return aReturn;


    });


    service.on("READ", UsersExtensions, async (context, next) => {
        // console.log("USEREX", context.user.id);

        // console.log("Key", context.data.ID);
        let aUsers = [],
            aUserProfile = [],
            oUserProfile = {},
            aPerfilAcoes = [],
            oPerfilAcao = {},
            oUser = {},
            aUsersEx = [],
            oUserEx = {
                ID: "",
                userProfile_ID: "",
                nomeColaborador: "",
                cargo: "",
                telefone: "",
                emailFuncionario: "",
                centroDeCustoColab: "",
                departamento: "",
                gerencia: "",
                centroDeCustoGerencia: "",
                coordenador: "",
                matriculaCoordenador: "",
                emailCoordenador: "",
                gerente: "",
                superintendencia: "",
                diretor: "",
                userProfile: {}
            }

        if (context.data.ID) {
            oUserEx.ID = context.data.ID;
        } else {
            oUserEx.ID = context.user.id;
        }

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: oUserEx.ID
        });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
            // console.log("USUARIO:", oUser);
            //Busca Perfil do Usuário Logado
            aUserProfile = await cds.read(Perfis).where({
                ID: oUser.perfil_ID
            });
            if (aUserProfile.length > 0) {
                oUserProfile = aUserProfile[0];
                console.log("PERFIL_USUARIO:", oUserProfile);
                //Busca Ações do Perfil
                aPerfilAcoes = await cds.read(PerfilAcoes).where({
                    ID: oUser.perfil_ID
                });
                if (aPerfilAcoes.length > 0) {
                    oPerfilAcao = aPerfilAcoes[0];
                    console.log("PERFIL_AÇÕES:", oPerfilAcao);
                    oUserEx.acoes = oPerfilAcao;
                    oUserEx.acoes_ID = oPerfilAcao.ID;
                    //Se Diretor Possui Comissões ele pode criar/editar temas para as mesmas
                    if (oUser.perfil_ID === "VP_DIR") {
                        const aComissoesUsuario = await cds.read(ComissoesRepresentante).where({
                            usuario_ID: oUser.ID
                        });
                        if (aComissoesUsuario.length > 0) {
                            oUserEx.acoes.createTemas = true;
                        } else {
                            oUserEx.acoes.createTemas = false;
                        }
                    }

                }
            }

            oUserEx.ID = oUser.ID;
            oUserEx.userProfile_ID = oUserProfile.ID;
            oUserEx.nomeColaborador = oUser.nome;
            oUserEx.userProfile = oUserProfile;
            oUserEx.cargo = oUser.cargo;
            oUserEx.telefone = oUser.telefone;
            oUserEx.diretor = oUser.diretorGeral;
            oUserEx.diretorGeral = oUser.diretorGeral;
            oUserEx.superintendencia = oUser.diretorExecutivo;
            oUserEx.diretorExecutivo = oUser.diretorExecutivo;
        }

        //############## Chama Api de Hierarquia #################################
        let matricula = "";
        const re = /\S+@\S+\.\S+/;

        if (re.test(oUserEx.ID)) {
            matricula = oUser.matricula;
        } else {
            matricula = oUserEx.ID;
        }

        if (matricula === "P0646683") {
            //Usuario Porto
            matricula = oUser.matricula;
        }

        const oResponse = await getColaborador(matricula).then(ret_api_hierarquia => {

            if (ret_api_hierarquia && ret_api_hierarquia.Nome_Funcionario) {
                oUserEx.nomeColaborador = ret_api_hierarquia.Nome_Funcionario;
                oUserEx.cargo = ret_api_hierarquia.Nome_Cargo_Funcionario;
                oUserEx.emailFuncionario = ret_api_hierarquia.Email_Funcionario;
                oUserEx.centroDeCustoColab = ret_api_hierarquia.Codigo_CentroCusto_Funcionario;
                oUserEx.departamento = ret_api_hierarquia.Nome_Area_Funcionario;
                oUserEx.gerencia = ret_api_hierarquia.Nome_Gerente;
                oUserEx.centroDeCustoGerencia = "";
                oUserEx.coordenador = ret_api_hierarquia.Nome_Coordenador;
                oUserEx.matriculaCoordenador = ret_api_hierarquia.Cadastro_Coordenador;
                oUserEx.emailCoordenador = "";
                oUserEx.gerente = ret_api_hierarquia.Nome_Gerente;
                oUserEx.diretorExecutivo = ret_api_hierarquia.Nome_Superintendente;
                oUserEx.superintendencia = ret_api_hierarquia.Nome_Superintendente;
                oUserEx.diretorGeral = ret_api_hierarquia.Nome_Vice_Presidente;
                oUserEx.diretor = ret_api_hierarquia.Nome_Vice_Presidente;
            }

            //console.log("Usr API hierarquia", oUserEx);

            if (context.data.ID) {
                return oUserEx;
            } else {
                aUsersEx.push(oUserEx);
                return aUsersEx;
            }

        });

        return oResponse;
        //################################################################ 

    });

    async function getColaborador(matricula) {

        let oColaborador = {},
            oAppSettings = {},
            vApi = "1";

        console.log("DataBase Colaboradores", matricula);

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

            console.log("Busca Colaborador Base Hana EmpregadoDoSenior");

            var resPromisse = new Promise(function (resolve, reject) {
                bancoColaboradores.exec(`SELECT *
            FROM DDCE7AB5E0FC4A0BB7674B92177066FB."EmpregadoDoSenior.Empregado" as Empregado
            WHERE Empregado."Login_Funcionario" = '${matricula}'`,
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

            console.log("Busca dados Colaborador API Hierarquia - REST");

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
                url: `${oAppSettings.urlApi}?login=${matricula}`,
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

        /*
                let //sPath = `/xsodata/workflows.xsodata/EmpregadosSet('${matricula}')`,
                try {
                    const response = await destination({
                        method: "get",
                        url: sPath,
                        headers: {
                            "content-type": "application/json"
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

    service.on("comissoesSemRepresentante", async req => {

        let aReturn = [];

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        // console.log("Comissoes com Representante", aComissoesComRep.length)

        for (let i = 0; i < aComissoes.length; i++) {
            const element = aComissoes[i];

            const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

            if (!find) {
                aReturn.push(element);
            }
        }

        //console.log("Comissoes SEM Representante", aReturn.length)


        return aReturn;
    });


    service.on("comissoesComRepresentante", async req => {

        let aReturn = [];
        let aUsers = [],
            oUser = {};

        //Busca Usuários
        aUsers = await cds.read(Usuarios);
        //Recupera Usuario Logado
        oUser = aUsers.find(usr => usr.ID === req.user.id);

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante),
            aComissoesUser = aComissoesRep.filter(cr => {
                return cr.usuario_ID === oUser.ID
            });

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        console.log("Comissoes com Representante", aComissoesComRep.length)
        switch (oUser.perfil_ID) {
            case "ADM":
            case "PRES":
                for (let i = 0; i < aComissoes.length; i++) {
                    const element = aComissoes[i];

                    const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

                    if (find) {
                        aReturn.push(element);
                    }
                }
                break;
            case "VP_DIR":
                //Somente Vizualiza dados de sua responsábilidade
                for (let y = 0; y < aComissoes.length; y++) {
                    const element = aComissoes[y];

                    const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

                    if (find) {
                        var oRepresentante = aUsers.find(user => user.ID === find.usuario_ID);
                        oRepresentante.diretorGeral = oRepresentante.diretorGeral ? oRepresentante.diretorGeral : "";
                        oRepresentante.diretorExecutivo = oRepresentante.diretorExecutivo ? oRepresentante.diretorExecutivo : "";
                        if (oRepresentante.diretorGeral.toUpperCase() === oUser.nome.toUpperCase()) {
                            //console.log("diretor Geral")
                            aReturn.push(element);
                        } else if (oRepresentante.diretorExecutivo.toUpperCase() === oUser.nome.toUpperCase()) {
                            //console.log("diretor executivo")
                            aReturn.push(element);
                        } else {
                            //verifica se comissão esta relacionada com o Usuário logado
                            var found = aComissoesUser.find(acr => acr.comissao_ID === element.ID);

                            if (found) {
                                aReturn.push(element);
                            }

                        }
                    }
                }
                break;
            default:
                break;
        }

        return aReturn;
    });



    service.on("representacoesMercado", async req => {

        let aReturn = [];

        const aComissoes = await cds.read(Comissoes),
            aComissoesRep = await cds.read(ComissoesRepresentante),
            aReguladores = await cds.read(Reguladores);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep = aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );

        console.log("Comissoes com Representante", aComissoesComRep.length)

        for (let i = 0; i < aComissoes.length; i++) {
            const element = aComissoes[i];
            var oReturn = {};

            oReturn.ID = element.ID;
            oReturn.comissao = element.descricao;

            if (element.regulador_ID) {
                const oRegulador = aReguladores.find(r => r.ID === element.regulador_ID);
                oReturn.regulador = oRegulador.descricao;
            } else {
                oReturn.regulador = "OUTROS";
            }

            const find = aComissoesComRep.find(f => f.comissao_ID === element.ID);

            if (find) {

                oReturn.comIndicacao = true;

            } else {
                oReturn.comIndicacao = false;
            }

            aReturn.push(oReturn);
        }

        //console.log("Comissoes SEM Representante", aReturn.length)


        return aReturn;
    });

    service.on("getRepresentacoesPorCargo", async req => {

        let aReturn = []
        aRepresentacoesPorCargo = [],
            oUser = {}
        aComissUserLogado = [];

        const aComissoesRep = await cds.read(ComissoesRepresentante),
            aRepresentantes = await cds.read(Usuarios),
            aCalssifCargo = await cds.read(CargoClassificacoes);

        //Filtra somente Comissões com Representante atribuido   
        const aComissoesComRep =  aComissoesRep.filter((comissao, index, self) =>
            index === self.findIndex((t) => (
                t.comissao_ID === comissao.comissao_ID && t.comissao_ID === comissao.comissao_ID
            ))
        );
        //Usuário Logado
        oUser = aRepresentantes.find(usr => usr.ID === req.user.id);
        //Busca Comissões Usuário Logado
        if (oUser) {
            aComissUserLogado = aComissoesRep.filter(acr => {
                return acr.usuario_ID === oUser.ID
            });
        }

        console.log("Comissoes com Representante", aComissoesComRep.length);
        console.log("Comissoes Usuario Logado", aComissUserLogado.length);

        //Monta lista de Representacoes por Cargo
        for (let i = 0; i < aComissoesComRep.length; i++) {
            const element = aComissoesComRep[i];
            var oRepPorCargo = {};

            oRepPorCargo.ID = element.ID;

            var oRepresentante = aRepresentantes.find(rep => rep.ID === element.usuario_ID);

            const oClassCargo = aCalssifCargo.find(carg => carg.ID === oRepresentante.cargoClassif_ID);
            oRepPorCargo.cargo = oClassCargo ? oClassCargo.descricao : oRepresentante.cargo;
            if (oUser.perfil_ID === "ADM" || oUser.perfil_ID === "PRES") {
                aRepresentacoesPorCargo.push(oRepPorCargo);
            } else if (oUser.perfil_ID === "VP_DIR") {

                oRepresentante.diretorGeral = oRepresentante.diretorGeral ? oRepresentante.diretorGeral : "";
                oRepresentante.diretorExecutivo = oRepresentante.diretorExecutivo ? oRepresentante.diretorExecutivo : "";

                //Busca Diretor Geral e Diretor Executivo
                /* const oColaborador = await getColaborador(oRepresentante.ID).then(ret_api_hierarquia => {return ret_api_hierarquia});
                 if (oColaborador) {
                     console.log("Retorno:", oColaborador.Nome_Vice_Presidente);
                 }*/

                if (oRepresentante.diretorGeral.toUpperCase() === oUser.nome.toUpperCase()) {
                    //console.log("diretor Geral")
                    aRepresentacoesPorCargo.push(oRepPorCargo);
                } else if (oRepresentante.diretorExecutivo.toUpperCase() === oUser.nome.toUpperCase()) {
                    //console.log("diretor executivo")
                    aRepresentacoesPorCargo.push(oRepPorCargo);
                } else {
                    //verifica se comissão esta relacionada com o Usuário logado
                    var found = aComissUserLogado.find(acr => acr.comissao_ID === element.comissao_ID);

                    if (found) {
                        aRepresentacoesPorCargo.push(oRepPorCargo);
                    }

                }


            }

        }
        //Agrupa por Cargos
        console.log("lista de Representacoes por Cargo", aRepresentacoesPorCargo.length);
        const aRepCargos = aRepresentacoesPorCargo.filter((cargo, index, self) =>
            index === self.findIndex((t) => (
                t.cargo === cargo.cargo && t.cargo === cargo.cargo
            )));

        console.log("Agrupa por Cargos", aRepCargos.length);

        for (let z = 0; z < aRepCargos.length; z++) {
            const cargo = aRepCargos[z];
            var oReturn = {};
            oReturn.ID = cargo.cargo;
            oReturn.cargo = cargo.cargo;

            var aQtdPorCargo = aRepresentacoesPorCargo.filter(ac => {
                return ac.cargo === cargo.cargo
            });
            oReturn.qtd = aQtdPorCargo.length;

            aReturn.push(oReturn);

        }


        return aReturn;

    });

    service.on("deleteSelectedUsers", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {
            // console.log(req.data.ids.split(";"));
            let aUsersDelete = req.data.ids.split(";");
            for (let i = 0; i < aUsersDelete.length; i++) {
                const userDel = aUsersDelete[i];
                if (userDel.length > 4) {
                    console.log(userDel);

                    try {
                        const delComissoesUsuario = await service.delete(ComissoesRepresentante).where({
                            usuario_ID: userDel
                        })
                        console.log("Comissoes usuario deletadas", delComissoesUsuario);
                    } catch (error) {
                        console.log("Erro ao Excluir Comissoes", error);
                    }

                    try {
                        const delUsuario = await service.delete(Usuarios).where({
                            ID: userDel
                        });
                        console.log("Usuario deletado", userDel);
                    } catch (error) {
                        console.log("Erro ao Excluir Usuario", error);
                    }


                }

            }
        } else {
            req.reject(403, "Não Autorizado");
        }


    });


    service.on("deleteSelectedReguladores", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {

            //console.log(req.data.ids.split(";"));
            let aReguDelete = req.data.ids.split(";");
            for (let i = 0; i < aReguDelete.length; i++) {
                const reguDel = aReguDelete[i];
                if (reguDel !== "") {

                    try {
                        //console.log(reguDel);
                        const deRegulador = await service.delete(Reguladores).where({
                            ID: reguDel
                        })
                        console.log("Regulador deletado", deRegulador);
                    } catch (error) {
                        console.log("Errro ao excluir Regulador", error);
                        req.reject(400, error);
                    }



                }

            }
        } else {
            req.reject(403, "Não Autorizado");
        }

    });


    service.on("deleteSelectedComissoes", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {


            //console.log(req.data.ids.split(";"));
            let aComissoesDelete = req.data.ids.split(";");
            for (let i = 0; i < aComissoesDelete.length; i++) {
                const comissaoDel = aComissoesDelete[i];
                if (comissaoDel !== "") {


                    try {
                        //console.log(comissaoDel);
                        const delComissaoUsuario = await service.delete(ComissoesRepresentante).where({
                            comissao_ID: comissaoDel
                        })
                        console.log("Comissao Usuario deletada", delComissaoUsuario);
                    } catch (error) {
                        console.log("Errro ao excluir Comissao Usuario", error);
                        //req.reject(400, error);
                    }

                    try {
                        //console.log(comissaoDel);
                        const delComissao = await service.delete(Comissoes).where({
                            ID: comissaoDel
                        })
                        console.log("Comissao deletada", delComissao);
                    } catch (error) {
                        console.log("Errro ao excluir Comissao", error);
                        req.reject(400, error);
                    }


                }

            }
        } else {
            req.reject(403, "Não Autorizado");
        }


    });

    service.on("deleteSelectedTiposAlerta", async req => {

        let aUsers = [],
            oUser = {};

        //Busca dados Usuário logado
        aUsers = await cds.read(Usuarios).where({
            ID: req.user.id
        });
        if (aUsers.length > 0) {
            oUser = aUsers[0];
        }

        if (oUser.perfil_ID === "ADM") {

            //console.log(req.data.ids.split(";"));
            let aTpAlertaDelete = req.data.ids.split(";");
            for (let i = 0; i < aTpAlertaDelete.length; i++) {
                const tpAlertDel = aTpAlertaDelete[i];
                if (tpAlertDel !== "") {

                    try {
                        //console.log(tpAlertDel);
                        const deTipoAlerta = await service.delete(TiposAlerta).where({
                            ID: tpAlertDel
                        })
                        console.log("Tipo de Alerta deletado", deTipoAlerta);
                    } catch (error) {
                        console.log("Errro ao excluir tipo de Alerta", error);
                        req.reject(500, error);
                    }

                }

            }
        } else {
            req.reject(403, "Não Autorizado");
        }

    });


    service.on("replicaEventoAlerta", async req => {

        let aUsers = [],
            aCalendarioUsers = [],
            aPerfisQueRecebem = [],
            aUsuariosQueRecebem = [],
            aEventosAlerta = [],
            oEventoOrigem = {},
            oUser = {};


        aUsers = await cds.read(Usuarios); //.where({ ID:  req.user.id });
        aCalendarioUsers = await cds.read(AlertasUsuario);
        aEventosAlerta = await cds.read(EventosAlerta).where({
            ID: req.data.idEvento
        });
        //Busca dados Usuário logado
        if (aUsers.length > 0) {
            oUser = aUsers.find(user => user.ID === req.user.id);
        }
        if (aEventosAlerta.length > 0) {
            oEventoOrigem = aEventosAlerta[0];
        }

        console.log("Calendários Recuperados:", aCalendarioUsers.length);

        if (oUser.perfil_ID === "ADM") {

            //Verifica se é uma Criação ou Alteração do Evento
            if (!req.data.bCreate) {
                //Exclui os eventos onde há relação com o Evento Origem
                console.log("Exclui os eventos onde há relação com o Evento Origem", oEventoOrigem.ID);
                const delEvents = await cds.delete(EventosAlerta).where({
                    eventoOrigem_ID: oEventoOrigem.ID
                });
                console.log("Eventos excluidos com sucesso", oEventoOrigem.ID);
            }

            if (!oEventoOrigem.alertaPessoal) {

                aPerfisQueRecebem = req.data.perfisQueRecebem.split("|");
                aUsuariosQueRecebem = req.data.usuariosQueRecebem.split("|");

                if (aPerfisQueRecebem.length > 0) {
                    //Replica o Alerta para todos os Usuários dos Perfis informados  
                    for (let i = 0; i < aPerfisQueRecebem.length; i++) {
                        const perfil = aPerfisQueRecebem[i];
                        console.log("Perfis Que irão receber o Alerta", aPerfisQueRecebem);
                        var usersPorPerfil = aUsers.filter(usr => {
                            return usr.perfil_ID === perfil
                        });

                        if (usersPorPerfil.length > 0) {

                            for (let x = 0; x < usersPorPerfil.length; x++) {
                                const usuario = usersPorPerfil[x];
                                //Não criar novamente o evento para o Usuário ADM Logado
                                if (usuario.ID !== oUser.ID) {
                                    const oCalendarioUser = aCalendarioUsers.find(calend => calend.usuario_ID === usuario.ID);

                                    if (oCalendarioUser) {

                                        console.log("Id Calendário:", oCalendarioUser.ID);
                                        const oEventoReplica = {

                                            descricao: oEventoOrigem.descricao,
                                            dtInicio: oEventoOrigem.dtInicio,
                                            dtFim: oEventoOrigem.dtFim,
                                            tipo: "Type06",
                                            conteudo: oEventoOrigem.conteudo,
                                            enviaEmail: oEventoOrigem.enviaEmail,
                                            tentative: false,
                                            concluido: false,
                                            alertaPessoal: true,
                                            statusTemas: oEventoOrigem.statusTemas,
                                            tipoAlerta_ID: oEventoOrigem.tipoAlerta_ID,
                                            eventoOrigem_ID: oEventoOrigem.ID,
                                            alertaUsuario_ID: oCalendarioUser.ID

                                        };

                                        console.log("Replicando Evento para o calendario do Usuario", usuario.ID);
                                        const aRowsP = await service.create(EventosAlerta).entries(oEventoReplica);
                                        console.log("Evento replicado com sucesso para Usuario", usuario.ID);

                                    }
                                }

                            }


                        }

                    }

                }

                if (aUsuariosQueRecebem.length > 0) {
                    //Replica o Alerta para todos os Usuários informados
                    console.log("Usuarios Que irão receber o Alerta", aUsuariosQueRecebem)
                    for (let z = 0; z < aUsuariosQueRecebem.length; z++) {
                        const usuario_ID = aUsuariosQueRecebem[z];

                        //Não criar novamente o evento para o Usuário ADM Logado
                        if (usuario_ID !== oUser.ID) {

                            const oCalendarioUser = aCalendarioUsers.find(calend => calend.usuario_ID === usuario_ID);

                            if (oCalendarioUser) {
                                console.log("Id Calendário:", oCalendarioUser.ID);
                                const oEventoReplica = {

                                    descricao: oEventoOrigem.descricao,
                                    dtInicio: oEventoOrigem.dtInicio,
                                    dtFim: oEventoOrigem.dtFim,
                                    tipo: "Type06",
                                    conteudo: oEventoOrigem.conteudo,
                                    enviaEmail: oEventoOrigem.enviaEmail,
                                    tentative: false,
                                    concluido: false,
                                    alertaPessoal: true,
                                    statusTemas: oEventoOrigem.statusTemas,
                                    tipoAlerta_ID: oEventoOrigem.tipoAlerta_ID,
                                    eventoOrigem_ID: oEventoOrigem.ID,
                                    alertaUsuario_ID: oCalendarioUser.ID

                                };

                                console.log("Replicando Evento para o calendario do Usuario", usuario_ID);
                                const aRowsP = await service.create(EventosAlerta).entries(oEventoReplica);
                                console.log("Evento replicado com sucesso para Usuario", usuario_ID);
                            }
                        }

                    }

                }

            }
        }

    });


});