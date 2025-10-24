import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../services/order_service.dart';

/// 주문 생성 페이지
class CreateOrderPage extends ConsumerStatefulWidget {
  const CreateOrderPage({super.key});

  @override
  ConsumerState<CreateOrderPage> createState() => _CreateOrderPageState();
}

class _CreateOrderPageState extends ConsumerState<CreateOrderPage> {
  final _formKey = GlobalKey<FormState>();
  final _orderService = OrderService();
  
  // Form Controllers
  final _itemNameController = TextEditingController();
  final _itemDescriptionController = TextEditingController();
  final _notesController = TextEditingController();
  
  // State
  final List<String> _imageUrls = [];
  int _selectedPrice = 15000;
  bool _isLoading = false;

  @override
  void dispose() {
    _itemNameController.dispose();
    _itemDescriptionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  /// 이미지 선택
  Future<void> _pickImage() async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(source: ImageSource.gallery);
      
      if (image == null) return;

      setState(() => _isLoading = true);

      // Supabase Storage에 업로드
      final url = await _orderService.uploadImage(image.path);
      
      setState(() {
        _imageUrls.add(url);
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('이미지가 업로드되었습니다')),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('이미지 업로드 실패: $e')),
        );
      }
    }
  }

  /// 주문 생성
  Future<void> _createOrder() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      // 1. 주문 생성
      final order = await _orderService.createOrder(
        itemName: _itemNameController.text,
        itemDescription: _itemDescriptionController.text,
        basePrice: _selectedPrice,
        totalPrice: _selectedPrice,
        pickupAddress: '서울시 강남구 테헤란로 123', // TODO: 실제 주소
        deliveryAddress: '서울시 강남구 테헤란로 123',
        imageUrls: _imageUrls,
        notes: _notesController.text,
      );

      if (mounted) {
        // 2. 결제 화면으로 이동
        context.push('/payment/${order['id']}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('주문 생성 실패: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('수선 접수'),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 이미지 업로드
              _buildImageSection(),
              const SizedBox(height: 24),
              
              // 수선 항목
              TextFormField(
                controller: _itemNameController,
                decoration: const InputDecoration(
                  labelText: '수선 항목',
                  hintText: '예: 청바지 기장 수선',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return '수선 항목을 입력하세요';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              
              // 상세 설명
              TextFormField(
                controller: _itemDescriptionController,
                decoration: const InputDecoration(
                  labelText: '상세 설명',
                  hintText: '예: 기장을 3cm 줄여주세요',
                ),
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return '상세 설명을 입력하세요';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              
              // 가격 선택
              _buildPriceSection(),
              const SizedBox(height: 16),
              
              // 요청사항
              TextFormField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: '요청사항 (선택)',
                  hintText: '추가 요청사항을 입력하세요',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 32),
              
              // 주문 생성 버튼
              ElevatedButton(
                onPressed: _isLoading ? null : _createOrder,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        '₩${_selectedPrice.toString().replaceAllMapped(
                          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
                          (Match m) => '${m[1]},',
                        )} 결제하기',
                        style: const TextStyle(fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '수선할 의류 사진',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        
        // 이미지 그리드
        if (_imageUrls.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _imageUrls.map((url) {
              return Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      url,
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    right: 4,
                    top: 4,
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _imageUrls.remove(url);
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        
        const SizedBox(height: 8),
        
        // 이미지 추가 버튼
        OutlinedButton.icon(
          onPressed: _isLoading ? null : _pickImage,
          icon: const Icon(Icons.add_photo_alternate_outlined),
          label: const Text('사진 추가'),
        ),
      ],
    );
  }

  Widget _buildPriceSection() {
    final prices = [
      {'label': '기본 수선', 'price': 15000},
      {'label': '정밀 수선', 'price': 25000},
      {'label': '특수 수선', 'price': 35000},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '수선 가격',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ...prices.map((item) {
          final price = item['price'] as int;
          return RadioListTile<int>(
            title: Text(item['label'] as String),
            subtitle: Text('₩${price.toString().replaceAllMapped(
              RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
              (Match m) => '${m[1]},',
            )}'),
            value: price,
            groupValue: _selectedPrice,
            onChanged: (value) {
              setState(() {
                _selectedPrice = value!;
              });
            },
          );
        }),
      ],
    );
  }
}

