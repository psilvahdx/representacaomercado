namespace representacaomercado.db;

using { managed, cuid  } from '@sap/cds/common';

entity Comissoes : cuid {
    key ID : Integer;
    descricao : String;
    regulador : Association to Reguladores;
}

entity Status : cuid {
    key ID : Integer;
    descricao : String;
}

entity Reguladores : cuid {
    key ID : Integer;
    descricao : String;
}

entity Criticidades : cuid {
    key ID : Integer;
    descricao : String;
}

entity Usuarios : cuid {
    key ID : String;
    nome : String;
    telefone: String;
    cargo: String;
    perfil: Association to Perfis ;
}

entity Perfis : cuid {
    key ID: String;
    descricao: String;
}

entity Temas : cuid {
    key ID: Integer; 
    descricao : String;
	status : Association to Status ;
	criticidade : Association to Criticidades;
	regulador: Association to Reguladores;
	detalheDiscussao : String;
	principaisImpactos : String;
	primeiroRegistro : DateTime null;
	ultimoRegistro : DateTime null;
	dataUltimaReuniao : DateTime null;
	representante : Association to Usuarios;
	comissao : Association to Comissoes;
	diretorGeral : String;
	diretorExecutivo : String;
       
}

entity Historico : cuid {
    key ID: Integer; 
    idTema: Integer;
    descricao : String;
	status : Association to Status ;
	criticidade : Association to Criticidades;
	regulador: Association to Reguladores;
	detalheDiscussao : String;
	principaisImpactos : String;
	primeiroRegistro : DateTime null;
	ultimoRegistro : DateTime null;
	dataUltimaReuniao : DateTime null;
	representante : Association to Usuarios;
	comissao : Association to Comissoes;
	diretorGeral : String;
	diretorExecutivo : String;
    userAlteracao: Association to Usuarios;
       
}