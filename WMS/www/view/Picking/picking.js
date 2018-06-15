appControllers.controller('PickingListCtrl', [
    'ENV',
    '$scope',
    '$stateParams',
    '$state',
    '$cordovaKeyboard',
    'ApiService',
    function (
        ENV,
        $scope,
        $stateParams,
        $state,
        $cordovaKeyboard,
        ApiService) {
        $scope.rcbp1 = {};
        $scope.GinNo = {};
        $scope.Imgi1s = {};
        $scope.refreshRcbp1 = function (BusinessPartyName) {
            if (is.not.undefined(BusinessPartyName) && is.not.empty(BusinessPartyName)) {
                var objUri = ApiService.Uri(true, '/api/wms/rcbp1');
                objUri.addSearch('BusinessPartyName', BusinessPartyName);
                ApiService.Get(objUri, false).then(function success(result) {
                    $scope.Rcbp1s = result.data.results;
                });
            }
        };
        $scope.refreshGinNos = function (Grn) {
            if (is.not.undefined(Grn) && is.not.empty(Grn)) {
                var objUri = ApiService.Uri(true, '/api/wms/imgi1');
                objUri.addSearch('GoodsIssueNoteNo', Grn);
                ApiService.Get(objUri, true).then(function success(result) {
                    $scope.GinNos = result.data.results;
                });
            }
        };
        $scope.ShowImgi1 = function (CustomerCode) {
            var objUri = ApiService.Uri(true, '/api/wms/imgi1');
            objUri.addSearch('CustomerCode', CustomerCode);
            ApiService.Get(objUri, true).then(function success(result) {
                $scope.Imgi1s = result.data.results;
            });
            if (!ENV.fromWeb) {
                $cordovaKeyboard.close();
            }
        };
        $scope.showDate = function (utc) {
            return moment(utc).format('DD-MMM-YYYY');
        };
        $scope.GoToDetail = function (Imgi1) {
            if (Imgi1 !== null) {
                $state.go('pickingDetail', {
                    'CustomerCode': Imgi1.CustomerCode,
                    'TrxNo': Imgi1.TrxNo,
                    'GoodsIssueNoteNo': Imgi1.GoodsIssueNoteNo
                }, {
                    reload: true
                });
            }
        };
        $scope.returnMain = function () {
            $state.go('index.main', {}, {
                reload: true
            });
        };
    }
]);

appControllers.controller('PickingDetailCtrl', [
    'ENV',
    '$scope',
    '$stateParams',
    '$state',
    '$timeout',
    '$ionicPlatform',
    '$ionicHistory',
    '$ionicPopup',
    '$ionicModal',
    '$ionicLoading',
    '$cordovaToast',
    '$cordovaBarcodeScanner',
    '$cordovaKeyboard',
    'ApiService',
    'SqlService',
    'PopupService',
    function (
        ENV,
        $scope,
        $stateParams,
        $state,
        $timeout,
        $ionicPlatform,
        $ionicHistory,
        $ionicPopup,
        $ionicModal,
        $ionicLoading,
        $cordovaToast,
        $cordovaBarcodeScanner,
        $cordovaKeyboard,
        ApiService,
        SqlService,
        PopupService) {
        var popup = null;
        var hmImgi2 = new HashMap();
        var hmImsn1 = new HashMap();
        $scope.Detail = {
            Customer: $stateParams.CustomerCode,
            GIN: $stateParams.GoodsIssueNoteNo,
            Scan: {
                StoreNo: '',
                BarCode: '',
                SerialNo: '',
                Qty: 0
            },
            Imgi2: {
                RowNum: 0,
                TrxNo: 0,
                LineItemNo: 0,
                StoreNo: '',
                ProductCode: '',
                ProductDescription: '',
                SerialNoFlag: '',
                BarCode: '',
                PackingNo: '',
                Qty: 0,
                QtyBal: 0
            },
            Imgi2s: {},
            Imgi2sDb: {},
            Imsn1s: {},
            blnNext: true
        };
        $ionicModal.fromTemplateUrl('scan.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function (modal) {
            $scope.modal = modal;
        });
        $scope.$on('$destroy', function () {
            $scope.modal.remove();
        });
        var blnVerifyInput = function (type) {
            var blnPass = true;
            if (is.equal(type, 'StoreNo') && is.not.equal($scope.Detail.Scan.StoreNo, $scope.Detail.Imgi2.StoreNo)) {
                blnPass = false;
                PopupService.Alert(popup, 'Invalid Store No').then();
            } else if (is.equal(type, 'BarCode') && is.not.equal($scope.Detail.Scan.BarCode, $scope.Detail.Imgi2.BarCode)) {
                blnPass = false;
                PopupService.Alert(popup, 'Invalid Product Picked').then();
            } else if (is.equal(type, 'SerialNo') && is.not.equal($scope.Detail.Scan.SerialNo, $scope.Detail.Imgi2.SerialNo)) {
                blnPass = false;
                PopupService.Alert(popup, 'Invalid SerialNo ').then();
            }
            return blnPass;
        };
        var setScanQty = function (barcode, imgi2) {
            // if (is.equal(imgi2.SerialNoFlag, 'Y')) {
            //     $scope.Detail.Scan.Qty = imgi2.ScanQty;
            //     //$( '#txt-sn' ).removeAttr( 'readonly' );
            //     $('#txt-sn').select();
            // } else {
            SqlService.Select('Imgi2_Picking', '*', "BarCode='" + $scope.Detail.Scan.BarCode + "' And SerialNo='" + $scope.Detail.Scan.SerialNo + "'").then(function (results) {
                if (results.rows.length === 1) {
                    imgi2.ScanQty = (results.rows.item(0).ScanQty > 0 ? results.rows.item(0).ScanQty : 0);
                }
                imgi2.ScanQty += 1;
                // hmImgi2.remove(barcode);
                // hmImgi2.set(barcode, imgi2);
                var obj = {
                    ScanQty: imgi2.ScanQty,
                    PackingNo: $scope.Detail.Scan.PackingNo
                };
                var strFilter = "BarCode='" + $scope.Detail.Scan.BarCode + "' And SerialNo='" + $scope.Detail.Scan.SerialNo + "'";
                SqlService.Update('Imgi2_Picking', obj, strFilter).then(function (res) {
                    $scope.Detail.Scan.Qty = imgi2.ScanQty;
                    $scope.Detail.Scan.BarCode = '';
                    $scope.Detail.Imgi2.QtyBal = imgi2.Qty - imgi2.ScanQty;
                    if (is.equal(imgi2.Qty, imgi2.ScanQty)) {
                        $scope.showNext();
                    }
                });
            });
            // }
        };
        var showImpr = function (barcode, blnScan) {
            if (is.not.undefined(barcode) && is.not.null(barcode) && is.not.empty(barcode)) {
                if (hmImgi2.has(barcode)) {
                    var imgi2 = hmImgi2.get(barcode);
                    setScanQty(barcode, imgi2);
                } else {
                    PopupService.Alert('Invalid Product Picked', 'assertive');
                }
            }
        };
        var setSnQty = function (barcode, imgi2) {
            SqlService.Select('Imgi2_Picking', '*', 'TrxNo=' + imgi2.TrxNo + ' And LineItemNo=' + imgi2.LineItemNo).then(function (results) {
                if (results.rows.length === 1) {
                    imgi2.ScanQty = (results.rows.item(0).ScanQty > 0 ? results.rows.item(0).ScanQty : 0);
                }
                imgi2.ScanQty += 1;
                hmImgi2.remove(barcode);
                hmImgi2.set(barcode, imgi2);
                var obj = {
                    ScanQty: imgi2.ScanQty,

                };
                var strFilter = 'TrxNo=' + imgi2.TrxNo + ' And LineItemNo=' + imgi2.LineItemNo;
                SqlService.Update('Imgi2_Picking', obj, strFilter).then(function (res) {
                    $scope.Detail.Scan.Qty = imgi2.ScanQty;
                    $scope.Detail.Scan.SerialNo = '';
                    if (is.equal(imgi2.Qty, imgi2.ScanQty)) {
                        $scope.showNext();
                    } else {
                        $scope.Detail.Imgi2.QtyBal = imgi2.Qty - imgi2.ScanQty;
                        $('#txt-sn').select();
                    }
                });
            });
        };
        // var showSn = function (sn) {
        //     if (is.not.empty(sn)) {
        //         var barcode = $scope.Detail.Scan.BarCode,
        //             SnArray = null,
        //             imgi2 = hmImgi2.get(barcode);
        //         var imsn1 = {
        //             ReceiptNoteNo: '',
        //             ReceiptLineItemNo: '',
        //             IssueNoteNo: $scope.Detail.GIN,
        //             IssueLineItemNo: imgi2.LineItemNo,
        //             SerialNo: sn,
        //         };
        //         if (hmImsn1.count() > 0 && hmImsn1.has(barcode)) {
        //             SnArray = hmImsn1.get(barcode);
        //             if (is.not.inArray(sn, SnArray)) {
        //                 SnArray.push(sn);
        //                 hmImsn1.remove(barcode);
        //                 hmImsn1.set(barcode, SnArray);
        //             } else {
        //                 $scope.Detail.Scan.SerialNo = '';
        //                 // $scope.$apply();
        //                 return;
        //             }
        //         } else {
        //             SnArray = new Array();
        //             SnArray.push(sn);
        //             hmImsn1.set(barcode, SnArray);
        //         }
        //         //db_add_Imsn1_Picking(imsn1);
        //         setSnQty(barcode, imgi2);
        //     }
        // };
        $scope.showImgi2 = function (row) {
            if (row !== null && $scope.Detail.Imgi2s.length >= row) {
                $scope.Detail.Imgi2 = {
                    RowNum: $scope.Detail.Imgi2s[row].RowNum,
                    TrxNo: $scope.Detail.Imgi2s[row].TrxNo,
                    LineItemNo: $scope.Detail.Imgi2s[row].LineItemNo,
                    StoreNo: $scope.Detail.Imgi2s[row].StoreNo,
                    ProductTrxNo: $scope.Detail.Imgi2s[row].ProductTrxNo,
                    ProductCode: $scope.Detail.Imgi2s[row].ProductCode,
                    ProductDescription: $scope.Detail.Imgi2s[row].ProductDescription,
                    SerialNoFlag: $scope.Detail.Imgi2s[row].SerialNoFlag,
                    BarCode: $scope.Detail.Imgi2s[row].BarCode,
                    SerialNo: $scope.Detail.Imgi2s[row].SerialNo,
                    PackingNo: $scope.Detail.Imgi2s[row].PackingNo,
                    Qty: $scope.Detail.Imgi2s[row].Qty,
                    QtyBal: $scope.Detail.Imgi2s[row].Qty - $scope.Detail.Imgi2s[row].ScanQty
                };
                $scope.Detail.Scan.Qty = $scope.Detail.Imgi2s[row].ScanQty;
            }
            if (is.equal(row, $scope.Detail.Imgi2s.length - 1)) {
                $scope.Detail.blnNext = false;
            } else {
                $scope.Detail.blnNext = true;
            }

        };
        var GetImgi2s = function (GoodsIssueNoteNo) {
            var objUri = ApiService.Uri(true, '/api/wms/imgi2/picking');
            objUri.addSearch('GoodsIssueNoteNo', GoodsIssueNoteNo);
            ApiService.Get(objUri, true).then(function success(result) {
                $scope.Detail.Imgi2s = result.data.results;
                SqlService.Delete('Imgi2_Picking').then(function () {
                    if (is.array($scope.Detail.Imgi2s) && is.not.empty($scope.Detail.Imgi2s)) {
                        for (var i in $scope.Detail.Imgi2s) {
                            var imgi2 = $scope.Detail.Imgi2s[i];
                            hmImgi2.set(imgi2.BarCode, imgi2);
                            hmImgi2.set(imgi2.BarCode2, imgi2);
                            hmImgi2.set(imgi2.BarCode3, imgi2);
                            SqlService.Insert('Imgi2_Picking', imgi2).then();
                        }
                        $scope.showImgi2(0);
                    } else {
                        PopupService.Info(popup, 'This GIN has no Products').then(function (res) {
                            $scope.returnList();
                        });
                    }
                });
            });
        };
        //var GetImsn1SerialNo = function(GoodsIssueNoteNo) {
        //    var strUri = '/api/wms/imsn1?GoodsIssueNoteNo=' + GoodsIssueNoteNo;
        //    ApiService.Get(strUri, true).then(function success(result) {
        //        $scope.Detail.Imsn1s = result.data.results;
        //        db_del_Imsn1_Picking();
        //        if (is.array($scope.Detail.Imsn1s) && is.not.empty($scope.Detail.Imsn1s)) {
        //            for (var i = 0; i < $scope.Detail.Imsn1s.length; i++) {
        //                hmImsn1.set($scope.Detail.Imsn1s[i].IssueNoteNo + "#" + $scope.Detail.Imsn1s[i].IssueLineItemNo, Imsn1.SerialNo);
        //                db_add_Imsn1_Picking($scope.Detail.Imsn1s[i]);
        //            }
        //        }
        //    });
        //};
        //GetImsn1SerialNo($scope.Detail.GIN);
        $scope.openModal = function () {
            $scope.modal.show();
            $ionicLoading.show();
            SqlService.Select('Imgi2_Picking', '*').then(function (results) {
                var len = results.rows.length;
                var arr = new Array();
                for (var i = 0; i < len; i++) {
                    var imgi2 = results.rows.item(i);
                    imgi2.Qty = results.rows.item(i).Qty > 0 ? results.rows.item(i).Qty : 0;
                    imgi2.ScanQty = results.rows.item(i).ScanQty > 0 ? results.rows.item(i).ScanQty : 0;
                    imgi2.QtyBal = results.rows.item(i).QtyBal > 0 ? results.rows.item(i).QtyBal : 0;
                    imgi2.PackingNo = results.rows.item(i).PackingNo;
                    arr.push(imgi2);
                }
                $scope.Detail.Imgi2sDb = arr;
                $ionicLoading.hide();
            }, function (res) {
                $ionicLoading.hide();
            });
        };
        $scope.StatusAll = ["", "Damaged", "Shortlanded"];
        $scope.updateQtyStatus = function () {
            var len = $scope.Detail.Imgi2sDb.length;
            if (len > 0) {
                for (var i = 0; i < len; i++) {
                    var Imgi2_PickingFilter = "TrxNo='" + $scope.Detail.Imgi2sDb[i].TrxNo + "' and  LineItemNo='" + $scope.Detail.Imgi2sDb[i].LineItemNo + "' "; // not record
                    var objImgi2_Picking = {
                        QtyStatus: $scope.Detail.Imgi2sDb[i].QtyStatus
                    };
                    SqlService.Update('Imgi2_Picking', objImgi2_Picking, Imgi2_PickingFilter).then(function (res) {});
                }
            }
        };

        $scope.closeModal = function () {
            $scope.updateQtyStatus();
            $scope.Detail.Imgi2sDbImgi2sDb = {};
            $scope.modal.hide();
        };
        $scope.returnList = function () {
            $state.go('pickingList', {}, {
                reload: true
            });
        };
        $scope.checkQty = function () {
            if ($scope.Detail.Scan.Qty < 0) {
                $scope.Detail.Scan.Qty = 0;
            } else {
                if ($scope.Detail.Imgi2.Qty - $scope.Detail.Scan.Qty < 0) {
                    $scope.Detail.Scan.Qty = $scope.Detail.Imgi2.Qty;
                }
            }
        };
        $scope.changeQty = function () {
            if (is.not.empty($scope.Detail.Imgi2.BarCode) && hmImgi2.count() > 0) {
                var imgi2 = hmImgi2.get($scope.Detail.Imgi2.BarCode);
                var promptPopup = $ionicPopup.show({
                    template: '<input type="number" ng-model="Detail.Scan.Qty" ng-change="checkQty();">',
                    title: 'Enter Qty',
                    subTitle: 'Are you sure to change Qty manually?',
                    scope: $scope,
                    buttons: [{
                        text: 'Cancel'
                    }, {
                        text: '<b>Save</b>',
                        type: 'button-positive',
                        onTap: function (e) {
                            imgi2.ScanQty = $scope.Detail.Scan.Qty;
                            $scope.Detail.Imgi2.QtyBal = imgi2.Qty - imgi2.ScanQty;
                            var obj = {
                                ScanQty: imgi2.ScanQty
                            };
                            var strFilter = 'TrxNo=' + imgi2.TrxNo + ' And LineItemNo=' + imgi2.LineItemNo;
                            SqlService.Update('Imgi2_Picking', obj, strFilter).then();
                        }
                    }]
                });
            }
        };
        $scope.openCam = function (type) {
            if (!ENV.fromWeb) {
                if (is.equal(type, 'StoreNo')) {
                    $cordovaBarcodeScanner.scan().then(function (imageData) {
                        $scope.Detail.Scan.StoreNo = imageData.text;
                    }, function (error) {
                        $cordovaToast.showShortBottom(error);
                    });
                } else if (is.equal(type, 'PackingNo')) {
                    $cordovaBarcodeScanner.scan().then(function (imageData) {
                        $scope.PackingNo = imageData.text;
                        $scope.Detail.Scan.PackingNo = $scope.Detail.Scan.PackingNo === '' ? imageData.text : 　$scope.Detail.Scan.PackingNo;
                    }, function (error) {
                        $cordovaToast.showShortBottom(error);
                    });
                } else if (is.equal(type, 'BarCode')) {
                    $cordovaBarcodeScanner.scan().then(function (imageData) {
                        $scope.Detail.Scan.BarCode = imageData.text;
                        if ($scope.Detail.Imgi2.SerialNoFlag === 'Y') {
                            if (is.not.equal($scope.Detail.Scan.SerialNo, $scope.Detail.Imgi2.SerialNo)) {
                                PopupService.Alert(popup, 'Invalid SerialNo ').then();
                            } else {
                                if (blnVerifyInput('BarCode')) {
                                    showImpr($scope.Detail.Scan.BarCode);
                                }
                            }
                        } else {
                            showImpr($scope.Detail.Scan.BarCode, true);
                        }

                    }, function (error) {
                        $cordovaToast.showShortBottom(error);
                    });
                } else if (is.equal(type, 'SerialNo')) {
                    //if ($('#txt-sn').attr("readonly") != "readonly") {
                    $cordovaBarcodeScanner.scan().then(function (imageData) {
                        $scope.Detail.Scan.SerialNo = imageData.text;
                        if ($scope.Detail.Scan.SerialNo === $scope.Detail.Imgi2.SerialNo) {

                        } else {
                            PopupService.Info(popup, 'Invalid SerialNo ');
                            $scope.Detail.Scan.SerialNo = "";
                        }
                        // showSn($scope.Detail.Scan.SerialNo, false);
                    }, function (error) {
                        $cordovaToast.showShortBottom(error);
                    });
                    //}
                }
            }
        };
        $scope.clearInput = function (type) {
            if (is.equal(type, 'BarCode')) {
                if ($scope.Detail.Scan.BarCode.length > 0) {
                    $scope.Detail.Scan.BarCode = '';
                    // $scope.Detail.Scan.SerialNo = '';
                    $scope.Detail.Scan.Qty = 0;
                    //$('#txt-sn').attr('readonly', true);
                    $('#txt-barcode').select();
                }
            } else if (is.equal(type, 'SerialNo')) {
                if ($scope.Detail.Scan.SerialNo.length > 0) {
                    $scope.Detail.Scan.SerialNo = "";
                    $('#txt-sn').select();
                }
            } else if (is.equal(type, 'StoreNo')) {
                if ($scope.Detail.Scan.StoreNo.length > 0) {
                    $scope.Detail.Scan.StoreNo = '';
                    $('#txt-storeno').select();
                }
            } else if (is.equal(type, 'PackingNo')) {
                if ($scope.PackingNo.length > 0) {
                    $scope.PackingNo = '';
                    $('#txt-packingno').select();
                }
            } else {
                $scope.Detail.Scan.StoreNo = '';
                $scope.Detail.Scan.BarCode = '';
                $scope.Detail.Scan.SerialNo = '';
                $scope.Detail.Scan.Qty = 0;
                $scope.Detail.Scan.PackingNo = $scope.PackingNo;
                //$('#txt-sn').attr('readonly', true);
                $('#txt-storeno').select();
            }
        };
        $scope.showPrev = function () {
            var intRow = $scope.Detail.Imgi2.RowNum - 1;
            if ($scope.Detail.Imgi2s.length > 0 && intRow > 0 && is.equal($scope.Detail.Imgi2s[intRow - 1].RowNum, intRow)) {
                $scope.clearInput();
                returnImgi2s(intRow);
                // $scope.showImgi2(intRow - 1);
            } else {
                PopupService.Info(popup, 'Already the first one');
            }
        };

        var returnImgi2s = function (intRow) {
            SqlService.Select('Imgi2_Picking', '*').then(function (results) {
                if (results.rows.length > 0) {
                    var len = results.rows.length;
                    var arr = new Array();
                    for (var i = 0; i < len; i++) {
                        var imgi2 = results.rows.item(i);
                        arr.push(imgi2);
                    }
                    $scope.Detail.Imgi2s = arr;
                    $scope.showImgi2(intRow - 1);
                }
            });

        };
        $scope.showNext = function () {
            var intRow = $scope.Detail.Imgi2.RowNum + 1;
            if ($scope.Detail.Imgi2s.length > 0 && $scope.Detail.Imgi2s.length >= intRow && is.equal($scope.Detail.Imgi2s[intRow - 1].RowNum, intRow)) {
                $scope.clearInput();
                //                 SqlService.Select('Imgi2_Picking', '*').then(function (results) {
                //                     if (results.rows.length > 0) {
                //                                   var len = results.rows.length;
                //                                   var arr = new Array();
                //                                   for (var i = 0; i < len; i++) {
                //                                       var imgi2 = results.rows.item(i);
                //                                       arr.push(imgi2);
                //                                     }
                //                                     $scope.Detail.Imgi2s =arr;
                //                            $scope.showImgi2(intRow - 1);
                // }
                // });
                returnImgi2s(intRow);

            } else {
                PopupService.Info(popup, 'Already the last one');
            }
        };
        $scope.checkConfirm = function () {
            $ionicLoading.show();
            SqlService.Select('Imgi2_Picking', '*').then(function (results) {
                var len = results.rows.length;
                if (len > 0) {
                    var imgi2;
                    var blnDiscrepancies = false;
                    for (var i = 0; i < len; i++) {
                        imgi2 = results.rows.item(i);
                        if (is.not.empty(imgi2.BarCode)) {
                            if (imgi2.Qty != imgi2.ScanQty) {
                                if (imgi2.Qty > imgi2.ScanQty && imgi2.QtyStatus != null && (imgi2.QtyStatus === 'Damaged' || imgi2.QtyStatus === 'Shortlanded')) {
                                    var objUri = ApiService.Uri(true, '/api/wms/imgi2/qtyremark');
                                    objUri.addSearch('LineItemNo', imgi2.LineItemNo);
                                    objUri.addSearch('TrxNo', imgi2.TrxNo);
                                    objUri.addSearch('ReceiptMovementTrxNo', imgi2.ReceiptMovementTrxNo);
                                    objUri.addSearch('QtyRemarkQty', imgi2.ScanQty);
                                    objUri.addSearch('QtyRemarkBackQty', (imgi2.Qty - imgi2.ScanQty));
                                    objUri.addSearch('QtyFieldName', imgi2.QtyName);
                                    objUri.addSearch('PackingNo', imgi2.PackingNo);
                                    objUri.addSearch('UserId', sessionStorage.getItem('UserId').toString());
                                    objUri.addSearch('QtyRemark', imgi2.QtyStatus + ' LN:' + imgi2.LineItemNo + ' ' + imgi2.ProductCode + ' ' + imgi2.Qty + '>' + imgi2.ScanQty);
                                    ApiService.Get(objUri, true).then(function success(result) {});
                                } else {
                                    console.log('Product (' + imgi2.ProductCode + ') Qty not equal.');
                                    blnDiscrepancies = true;
                                }
                            } else if (imgi2.PackingNo !== null && imgi2.PackingNo !== '') {
                                var objUri = ApiService.Uri(true, '/api/wms/imgi2/packingno');
                                objUri.addSearch('LineItemNo', imgi2.LineItemNo);
                                objUri.addSearch('TrxNo', imgi2.TrxNo);
                                objUri.addSearch('UserId', sessionStorage.getItem('UserId').toString());
                                objUri.addSearch('PackingNo', imgi2.PackingNo);
                                ApiService.Get(objUri, true).then(function success(result) {});
                            }
                        } else {
                            blnDiscrepancies = true;
                        }
                    }
                    $ionicLoading.hide();
                    if (blnDiscrepancies) {
                        PopupService.Alert(popup, 'Discrepancies on Qty').then(function (res) {
                            $scope.openModal();
                        });
                    } else {
                        var objUri = ApiService.Uri(true, '/api/wms/imgi1/update');
                        objUri.addSearch('TrxNo', imgi2.TrxNo);
                        objUri.addSearch('UserID', sessionStorage.getItem('UserId').toString());
                        objUri.addSearch('GoodsIssueNoteNo', $scope.Detail.GIN);
                        objUri.addSearch('StatusCode', 'CMP');
                        ApiService.Get(objUri, true).then(function (res) {
                            return PopupService.Info(popup, 'Confirm Success');
                        }).then(function (res) {
                            $scope.returnList();
                        });
                    }
                } else {
                    $ionicLoading.hide();
                    PopupService.Alert(popup, 'Discrepancies on Qty').then(function (res) {
                        $scope.openModal();
                    });
                }
            });
        };
        $scope.PackingNo;
        $scope.enter = function (ev, type) {
            if (is.equal(ev.keyCode, 13)) {
                if (is.equal(type, 'barcode') && is.not.empty($scope.Detail.Scan.BarCode)) {

                    if ($scope.Detail.Imgi2.SerialNoFlag === 'Y') {
                        if (is.not.equal($scope.Detail.Scan.SerialNo, $scope.Detail.Imgi2.SerialNo)) {
                            blnPass = false;
                            PopupService.Alert(popup, 'Invalid SerialNo ').then();
                        } else {
                            if (blnVerifyInput('BarCode')) {
                                showImpr($scope.Detail.Scan.BarCode);
                            }
                        }
                    } else {
                        if (blnVerifyInput('BarCode')) {
                            showImpr($scope.Detail.Scan.BarCode);
                        }
                    }

                } else if (is.equal(type, 'serialno') && is.not.empty($scope.Detail.Imgi2.StoreNo)) {
                    if (blnVerifyInput('SerialNo')) {
                        // showSn($scope.Detail.SerialNo);
                        $('#txt-barcode').focus();
                    }
                } else if (is.equal(type, 'storeno') && is.not.empty($scope.Detail.Scan.StoreNo)) {
                    if (blnVerifyInput('StoreNo')) {
                        $('#txt-barcode').focus();
                    }
                } else if (is.equal(type, 'packingno') && is.not.empty($scope.PackingNo)) {
                    $scope.Detail.Scan.PackingNo = $scope.PackingNo;
                    $('#txt-sn').focus();
                }

                if (!ENV.fromWeb) {
                    $cordovaKeyboard.close();
                }
            }
        };
        $ionicPlatform.ready(function () {
            GetImgi2s($scope.Detail.GIN);
        });
    }
]);
