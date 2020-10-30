using {representacaomercado.db as db} from '../db/schema';

@path     : '/services/compliance'
@impl     : './dataAccess.js'
@requires : 'authenticated-user'
service FullSerice {

    entity Comissoes              as projection on db.Comissoes;
    entity Status                 as projection on db.Status;
    entity Reguladores            as projection on db.Reguladores;
    entity Criticidades           as projection on db.Criticidades;
    entity Perfis                 as projection on db.Perfis;
    entity PerfilAcoes            as projection on db.PerfilAcoes;
    entity Usuarios               as projection on db.Usuarios;
    entity CargoClassificacoes    as projection on db.ClassificacaoCargo;
    entity Temas                  as projection on db.Temas;
    entity Historico              as projection on db.Historico;
    entity ComissoesRepresentante as projection on db.ComissoesRepresentante;
    entity AppSettings            as projection on db.AppSettings;
    entity TiposAlerta            as projection on db.TiposAlerta;
    entity EventosAlerta          as projection on db.EventosAlerta;
    entity AlertasUsuario         as projection on db.AlertasUsuario;
    entity TemasPorRegulador      as projection on db.TemasPorRegulador;
    entity TemasPorCriticidade    as projection on db.TemasPorCriticidade;
    entity TemasPorRegItem as projection on db.TemasPorRegItem;
    entity TemasPorCrItem as projection on db.TemasPorCrItem;    


    entity RepresentacoesMercado {
        key ID           : Integer;
            comIndicacao : Boolean;
            comissao     : String;
            regulador    : String;
    };

    entity RepresentacoesPorCargo {
        key ID             : Integer;
            cargo          : String;
            comissao       : String;
            regulador      : String;
            ultimoRegistro : DateTime;
    };

     entity RepresentacoesPorCargoH {
        key ID             : UUID;
            cargo          : String;           
            ultimoRegistro : DateTime;
    };

    entity UsersExtensions {
        key ID                    : String;
            nomeColaborador       : String;
            cargo                 : String;
            telefone              : String;
            emailFuncionario      : String;
            centroDeCustoColab    : String;
            departamento          : String;
            gerencia              : String;
            centroDeCustoGerencia : String;
            coordenador           : String;
            matriculaCoordenador  : String;
            emailCoordenador      : String;
            gerente               : String;
            superintendencia      : String;
            diretor               : String;
            diretorGeral          : String;
            diretorExecutivo      : String;
            userProfile           : Association to Perfis;
            acoes                 : Association to PerfilAcoes;
    }

    action deleteSelectedUsers(ids : String);
    action deleteSelectedReguladores(ids : String);
    action deleteSelectedComissoes(ids : String);
    action deleteSelectedTiposAlerta(ids : String);
    action replicaEventoAlerta(idEvento : String, perfisQueRecebem : String, usuariosQueRecebem : String, bCreate : Boolean);
    function comissoesSemRepresentante() returns array of Comissoes;
    function comissoesComRepresentante() returns array of Comissoes;
    function representacoesMercado() returns array of RepresentacoesMercado;
    function representacoesPorCargo() returns array of RepresentacoesPorCargo;
    function getRepresentacoesPorCargo() returns array of RepresentacoesPorCargoH;
    function getUserExtension(ID : String) returns UsersExtensions;


}
