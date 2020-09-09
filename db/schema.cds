namespace representacaomercado.db;

using {
    managed,
    cuid
} from '@sap/cds/common';

entity Comissoes : cuid {
    key ID        : Integer;
        descricao : String;
        regulador : Association to Reguladores;
}

entity Status : cuid {
    key ID        : Integer;
        descricao : String;
}

entity Reguladores : cuid {
    key ID        : Integer;
        descricao : String;
}

entity Criticidades : cuid {
    key ID        : Integer;
        descricao : String;
}

entity Usuarios : cuid {
    key ID               : String;
        nome             : String;
        telefone         : String;
        cargo            : String;
        perfil           : Association to Perfis;
        comissoes        : Association to many ComissoesRepresentante
                               on comissoes.usuario = $self;
        diretorGeral     : String;
        diretorExecutivo : String;
        matricula        : String;
}

entity ComissoesRepresentante : cuid {
    key usuario  : Association to Usuarios;
    key comissao : Association to Comissoes;
}

entity Perfis : cuid {
    key ID        : String;
        descricao : String;
        acoes     : Association to PerfilAcoes;
}

entity Temas : cuid {
    key ID                 : Integer;
        descricao          : String;
        status             : Association to Status;
        criticidade        : Association to Criticidades;
        regulador          : Association to Reguladores;
        detalheDiscussao   : LargeString;
        principaisImpactos : LargeString;
        primeiroRegistro   : DateTime null;
        ultimoRegistro     : DateTime null;
        dataUltimaReuniao  : DateTime null;
        representante      : Association to Usuarios;
        comissao           : Association to Comissoes;
        diretorGeral       : String;
        diretorExecutivo   : String;

}

entity Historico : cuid {
    key ID                 : Integer;
        idTema             : Integer;
        descricao          : String;
        status             : Association to Status;
        criticidade        : Association to Criticidades;
        regulador          : Association to Reguladores;
        detalheDiscussao   : String;
        principaisImpactos : String;
        primeiroRegistro   : DateTime null;
        ultimoRegistro     : DateTime null;
        dataUltimaReuniao  : DateTime null;
        representante      : Association to Usuarios;
        comissao           : Association to Comissoes;
        diretorGeral       : String;
        diretorExecutivo   : String;
        userAlteracao      : Association to Usuarios;

}

entity PerfilAcoes : cuid {
    key ID                  : String;
        isDashBoardVisible  : Boolean;
        isCadastroVisible   : Boolean;
        changeRepresentante : Boolean;
        createTemas         : Boolean;
}

entity AppSettings : cuid {
    key ID : Integer;        
        urlApi: String;
        urlToken: String;
        @cds.api.ignore
        clientID: String;
        @cds.api.ignore
        clientSecret: String;

}
