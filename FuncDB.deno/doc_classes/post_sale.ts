import { Document, DocClass, IERPCore } from '../core/ERPMeta.ts'

export default class PostSale extends DocClass {
    
    static on_add(doc: Document, db: IERPCore): [boolean, string?] {
        db.tran_new()
        let err = ''
        doc.lines.forEach(line => {
            const balkey = [line.nomen, doc.stock]
            const bal = db.get_bal(balkey)
            if (bal.qty >= line.qty) {
                line.from = bal.id
                line.cost = (bal.val + bal.ival) / (bal.qty + bal.iqty) // себестоимость в момент списания с учетом ожидаемых приходов
                bal.qty -= line.qty
                bal.val -= line.qty * line.cost
                db.add_mut(bal)
            } else {
                err += '\n"' + balkey + '": requested ' + line.qty + ' but balance is only ' + bal.qty
            }
        })
        if (err === '') {
            db.tran_commit()
            return [true,]
        } else {
            db.tran_rollback()
            return [false, err] 
        }
    }
}
