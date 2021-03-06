import { Component, Injector, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppConsts } from '@shared/AppConsts';
import { NzModalService, NzModalRef, UploadFile } from 'ng-zorro-antd';
import { Product, SelectGroup } from '@shared/entity/product-center';
import { AppComponentBase } from '@shared/app-component-base';
import { ProductServiceProxy } from '@shared/service-proxies/product-center';

@Component({
    moduleId: module.id,
    selector: 'product-detail',
    templateUrl: 'product-detail.component.html',
    styleUrls: ['product-detail.component.less']
})
export class ProductDetailComponent extends AppComponentBase implements OnInit {
    id: number;
    cardTitle: string;
    validateForm: FormGroup;
    product: Product = new Product();
    host = AppConsts.remoteServiceBaseUrl;
    actionUrl = this.host + '/PosCloud/ProductPhotoPost?fileName=product';
    gradeTypes: any = [
        { text: '一类烟', value: 1 }, { text: '二类烟', value: 2 }, { text: '三类烟', value: 3 }
        , { text: '四类烟', value: 4 }, { text: '五类烟', value: 5 }
    ];
    isEnableTypes: any[] = [{ text: '启用', value: 1 }, { text: '禁用', value: 0 }];
    confirmModal: NzModalRef;
    isConfirmLoading = false;
    isDelete = false;
    productTypes: SelectGroup[] = [];
    tempGrade?: number;
    lableList: string[] = [];
    lablesText: string;
    constructor(injector: Injector
        , private fb: FormBuilder
        , private actRouter: ActivatedRoute
        , private router: Router
        , private modal: NzModalService
        , private productService: ProductServiceProxy) {
        super(injector);
        this.id = this.actRouter.snapshot.params['id'];
    }

    ngOnInit(): void {
        this.validateForm = this.fb.group({
            name: [null, Validators.compose([Validators.required, Validators.maxLength(200)])],
            pinYinCode: [null, Validators.compose([Validators.maxLength(200)])],
            productType: [null, Validators.compose([Validators.required])],
            unit: [null, Validators.compose([Validators.maxLength(50)])],
            barCode: [null, [Validators.compose([Validators.pattern(/^\+?[1-9][0-9]*$/), Validators.maxLength(50)])]],
            purchasePrice: [null, Validators.compose([Validators.pattern(/^(?:[1-9]\d*|0)(?:\.\d{1,2})?$/), Validators.maxLength(18)])],
            retailPrice: [null, Validators.compose([Validators.pattern(/^(?:[1-9]\d*|0)(?:\.\d{1,2})?$/), Validators.maxLength(18)])],
            desc: [null, Validators.compose([Validators.maxLength(500)])],
            isEnable: [null, Validators.compose([Validators.required])],
            grade: null,
            lable: [null, Validators.compose([Validators.maxLength(30)])]
        });
        this.getProductTypes();
    }

    getProductTypes() {
        this.productService.getProductTagsSelectGroup().subscribe((result: SelectGroup[]) => {
            this.productTypes = result;
            this.getProduct();
        });
    }

    getProduct() {
        if (this.id) {
            this.cardTitle = '编辑商品';
            let params: any = {};
            params.id = this.id;
            this.productService.getProductByIdAsync(params).subscribe((result: Product) => {
                this.product = result;
                this.tempGrade = result.grade;
                if (result.photoUrl) {
                    this.product.showPhoto = this.host + this.product.photoUrl;
                }
                if (this.product.lable != null && this.product.lable.length != 0) {
                    this.lableList = this.product.lable.split(',');
                }
                this.isDelete = true;
            });
        } else {
            //新增
            this.cardTitle = '新增商品';
            this.product.isEnable = 1;
            this.product.grade = 1;
        }
    }

    typeChange() {
        if (this.product.productTagId == 1 && this.tempGrade == null) {
            this.product.grade = 1;
        }
    }

    delete(): void {
        this.confirmModal = this.modal.confirm({
            nzContent: '是否删除商品?',
            nzOnOk: () => {
                this.productService.deleteProduct(this.product.id).subscribe(() => {
                    this.notify.info('删除成功!', '');
                    this.return();
                });
            }
        });
    }

    //图片上传返回
    handleChange(info: { file: UploadFile }): void {
        if (info.file.status === 'error') {
            this.notify.error('上传图片异常，请重试');
        }
        if (info.file.status === 'done') {
            this.getBase64(info.file.originFileObj, (img: any) => {
                this.product.showPhoto = img;
            });
            this.product.photoUrl = info.file.response.result.imageName;
            this.notify.success('上传图片完成');
        }
    }

    private getBase64(img: File, callback: (img: any) => void) {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    }

    save() {
        for (const i in this.validateForm.controls) {
            this.validateForm.controls[i].markAsDirty();
        }
        if (this.validateForm.valid) {
            this.isConfirmLoading = true;
            // if (typeof (this.product.photoUrl) == 'undefined') {
            //     this.product.photoUrl = '/default/defaultProduct.png';
            // }
            if (this.product.productTagId != 1) {
                this.product.grade = null;
            }
            if (this.lableList.length > 0) {
                this.product.lable = this.lableList.join(',');
            }
            this.productService.updateProductInfo(this.product).finally(() => { this.isConfirmLoading = false; })
                .subscribe((result: Product) => {
                    this.product = result;
                    if (result.photoUrl) {
                        this.product.showPhoto = this.host + this.product.photoUrl;
                    }
                    this.isDelete = true;
                    this.notify.info('保存成功', '');
                });
        }
    }

    return() {
        this.router.navigate(['app/product/product']);
    }

    addLable(lablesText: string) {
        if (lablesText != null && lablesText.trim().length !== 0 && !this.existsLables(lablesText)) {
            this.lablesText = this.lablesText.replace(/ /g, '').replace(/[\ |\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?]/g, "")
            this.lableList.push(this.lablesText);
            if (this.product.id) {
                this.product.lable = this.lableList.join(',');
                this.productService.updateProductLable(this.product)
                    .subscribe((data) => {
                        this.product.lable = data.lable;
                    });
            }
        }
        this.lablesText = null;
    }

    existsLables(lablesText: string): boolean {
        let bo = false;
        this.lableList.forEach(v => {
            if (v == lablesText) {
                bo = true;
                return;
            }
        });
        return bo;
    }

    onClose(event: Event, lablesText: string): void {
        let i = 0;
        this.lableList.forEach(v => {
            if (v == lablesText) {
                this.lableList.splice(i, 1);
                return;
            }
            i++;
        });
        if (this.lableList.length < 0) {
            this.lableList = null;
        }
        if (this.product.id) {
            this.product.lable = this.lableList.join(',');
            this.productService.updateProductLable(this.product)
                .subscribe((data) => {
                    this.product.lable = data.lable;
                });
        }
    }
}
