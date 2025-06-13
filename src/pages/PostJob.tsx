import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { uploadJSONToIPFS } from '@/utils/pinata';
import { uploadFileToIPFS } from '@/utils/pinata';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Building2, 
  Globe, 
  DollarSign, 
  Clock, 
  MapPin, 
  Sparkles, 
  Zap,
  X,
  CheckCircle,
  Upload,
  Plus,
  ArrowRight,
  Rocket,
  Users,
  Shield,
  Star,
  FileText,
  Tag,
  Calendar
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';

const JOBS_MODULE_ADDRESS = "0xf9c47e613fee3858fccbaa3aebba1f4dbe227db39288a12bfb1958accd068242";
const JOBS_MODULE_NAME = "job_marketplace_v5";

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface FormState {
  title: string;
  description: string;
  category: string;
  skills: string[];
  budgetMin: number;
  budgetMax: number;
  duration: string;
  location: 'remote' | 'onsite' | 'hybrid';
  immediate: boolean;
  experience: string;
  attachments: File[];
  applicationDeadlineDays: number;
  initialFundAmount: number;
}

const PostJob = () => {
  const navigate = useNavigate();
  const { account, accountType } = useWallet();
  const { profile } = useProfile();
  const [skill, setSkill] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    skills: [],
    budgetMin: 500,
    budgetMax: 2000,
    duration: '',
    location: 'remote',
    immediate: false,
    experience: '',
    attachments: [],
    applicationDeadlineDays: 7, // Default to 7 days
    initialFundAmount: 1000000, // Default to 1 APT (1_000_000 micro-APT)
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'budgetMin' || name === 'budgetMax' || name === 'applicationDeadlineDays' || name === 'initialFundAmount'
        ? Number(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillAdd = () => {
    if (skill && !form.skills.includes(skill)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const handleFileRemove = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề dự án';
    if (!form.description.trim()) newErrors.description = 'Vui lòng nhập mô tả công việc';
    if (!form.category.trim()) newErrors.category = 'Vui lòng chọn danh mục';
    if (!form.skills.length) newErrors.skills = 'Vui lòng nhập ít nhất 1 kỹ năng';
    if (!form.budgetMin || !form.budgetMax) newErrors.budget = 'Vui lòng nhập ngân sách';
    if (!form.duration.trim()) newErrors.duration = 'Vui lòng chọn thời gian thực hiện';
    if (!form.location.trim()) newErrors.location = 'Vui lòng chọn hình thức làm việc';
    if (!form.experience.trim()) newErrors.experience = 'Vui lòng chọn kinh nghiệm yêu cầu';
    if (!form.applicationDeadlineDays || form.applicationDeadlineDays <= 0) newErrors.applicationDeadlineDays = 'Vui lòng nhập thời hạn nộp đơn hợp lệ';
    if (!form.initialFundAmount || form.initialFundAmount <= 0) newErrors.initialFundAmount = 'Vui lòng nhập số tiền quỹ ban đầu hợp lệ';
    return newErrors;
  };

  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }

    if (!account || accountType !== 'aptos' || !window.aptos) {
      toast.error('Vui lòng kết nối ví Aptos để đăng dự án.');
      return;
    }

    setIsSubmitting(true);

    try {
      // First, transfer the initial fund amount to the contract address
      const transferPayload = {
        type: "entry_function_payload",
        function: "0x1::coin::transfer",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [
          JOBS_MODULE_ADDRESS,
          form.initialFundAmount * 1_000_000 // Amount in micro-APT
        ]
      };

      console.log("Transfer Payload:", transferPayload);
      const transferTxnHash = await window.aptos.signAndSubmitTransaction(transferPayload);
      await aptos.waitForTransaction({ transactionHash: transferTxnHash.hash });
      toast.success(`Chuyển ${form.initialFundAmount} APT thành công. Đang đăng dự án...`);

      // Upload attachments to IPFS
      const attachmentCIDs = await Promise.all(
        attachments.map(file => uploadFileToIPFS(file))
      );

      const jobData = {
        ...form,
        poster: account,
        posterProfile: profile.lastCID,
        postedAt: new Date().toISOString(),
        attachments: attachmentCIDs,
        status: 'open'
      };
      
      const cid = await uploadJSONToIPFS(jobData);
      
      const txnPayload = {
        type: "entry_function_payload",
        function: `${JOBS_MODULE_ADDRESS}::${JOBS_MODULE_NAME}::post_job`,
        type_arguments: [],
        arguments: [
          cid, // job_details_cid
          Math.floor(Date.now() / 1000) + form.applicationDeadlineDays * 24 * 60 * 60, // application_deadline (seconds from now)
          form.initialFundAmount * 1_000_000, // initial_fund_amount (convert APT to micro-APT)
          profile.did || "", // poster_did (from user profile)
          profile.lastCID || "" // poster_profile_cid (from user profile)
        ]
      };

      console.log("Transaction Payload Arguments:", txnPayload.arguments);
  
      const txnHash = await window.aptos.signAndSubmitTransaction(txnPayload);
      await aptos.waitForTransaction({ transactionHash: txnHash.hash });
  
      toast.success('Đăng dự án thành công!');
      navigate('/jobs');
    } catch (error) {
      console.error('Job post failed:', error);
      toast.error('Đăng dự án thất bại. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { value: 'Smart Contract Development', label: 'Phát triển Smart Contract' },
    { value: 'Frontend Development', label: 'Phát triển Frontend' },
    { value: 'Backend Development', label: 'Phát triển Backend' },
    { value: 'Design', label: 'Thiết kế' },
    { value: 'Security', label: 'Bảo mật' },
    { value: 'Content', label: 'Nội dung' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Blockchain', label: 'Blockchain' },
  ];

  const durations = [
    { value: 'Less than 1 week', label: 'Dưới 1 tuần' },
    { value: '1-2 weeks', label: '1-2 tuần' },
    { value: '2-4 weeks', label: '2-4 tuần' },
    { value: '1-3 months', label: '1-3 tháng' },
    { value: '3-6 months', label: '3-6 tháng' },
    { value: 'Ongoing', label: 'Dài hạn' },
  ];

  const experiences = [
    { value: 'entry', label: 'Mới bắt đầu' },
    { value: 'intermediate', label: 'Trung cấp' },
    { value: 'expert', label: 'Chuyên gia' },
  ];

  const locations = [
    { value: 'remote', label: 'Làm việc từ xa', icon: Globe },
    { value: 'onsite', label: 'Tại văn phòng', icon: Building2 },
    { value: 'hybrid', label: 'Kết hợp', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2 text-white">
                <Briefcase className="w-6 h-6 text-blue-400" />
                Đăng Dự Án Mới
              </CardTitle>
              <CardDescription className="text-gray-400">
                Điền thông tin chi tiết về dự án của bạn để tìm kiếm freelancer phù hợp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Tiêu đề dự án</Label>
                  <Input
                    id="title"
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Cần phát triển smart contract cho marketplace"
                    className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.title ? 'border-red-500/50' : ''}`}
                  />
                  {errors.title && <p className="text-red-400 text-sm">{errors.title}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Mô tả chi tiết</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Mô tả chi tiết về dự án, yêu cầu và mục tiêu..."
                    className={`min-h-[200px] bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.description ? 'border-red-500/50' : ''}`}
                  />
                  {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
                </div>

                {/* Category & Experience */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-white">Danh mục</Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) => handleSelectChange('category', value)}
                    >
                      <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.category ? 'border-red-500/50' : ''}`}>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value} className="text-white hover:bg-gray-800">
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-red-400 text-sm">{errors.category}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience" className="text-white">Kinh nghiệm yêu cầu</Label>
                    <Select
                      value={form.experience}
                      onValueChange={(value) => handleSelectChange('experience', value)}
                    >
                      <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.experience ? 'border-red-500/50' : ''}`}>
                        <SelectValue placeholder="Chọn kinh nghiệm" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {experiences.map((exp) => (
                          <SelectItem key={exp.value} value={exp.value} className="text-white hover:bg-gray-800">
                            {exp.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.experience && <p className="text-red-400 text-sm">{errors.experience}</p>}
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <Label className="text-white">Kỹ năng yêu cầu</Label>
                  <div className="flex gap-2">
                    <Input
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                      placeholder="Thêm kỹ năng..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd())}
                      className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.skills ? 'border-red-500/50' : ''}`}
                    />
                    <Button type="button" onClick={handleSkillAdd} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <Plus className="w-4 h-4 text-blue-400" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1 bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleSkillRemove(skill)}
                          className="text-blue-300 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {errors.skills && <p className="text-red-400 text-sm">{errors.skills}</p>}
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label className="text-white">Ngân sách (USDC)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="number"
                        name="budgetMin"
                        value={form.budgetMin}
                        onChange={handleInputChange}
                        placeholder="Tối thiểu"
                        className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.budget ? 'border-red-500/50' : ''}`}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        name="budgetMax"
                        value={form.budgetMax}
                        onChange={handleInputChange}
                        placeholder="Tối đa"
                        className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.budget ? 'border-red-500/50' : ''}`}
                      />
                    </div>
                  </div>
                  {errors.budget && <p className="text-red-400 text-sm">{errors.budget}</p>}
                </div>

                {/* Application Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="applicationDeadlineDays" className="text-white">Thời hạn nộp đơn (ngày)</Label>
                  <Input
                    id="applicationDeadlineDays"
                    name="applicationDeadlineDays"
                    type="number"
                    value={form.applicationDeadlineDays}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 7 (trong 7 ngày)"
                    className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.applicationDeadlineDays ? 'border-red-500/50' : ''}`}
                  />
                  {errors.applicationDeadlineDays && <p className="text-red-400 text-sm">{errors.applicationDeadlineDays}</p>}
                </div>

                {/* Initial Fund Amount */}
                <div className="space-y-2">
                  <Label htmlFor="initialFundAmount" className="text-white">Số tiền quỹ ban đầu (APT)</Label>
                  <Input
                    id="initialFundAmount"
                    name="initialFundAmount"
                    type="number"
                    value={form.initialFundAmount}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 1 (để escrow 1 APT)"
                    className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.initialFundAmount ? 'border-red-500/50' : ''}`}
                  />
                  {errors.initialFundAmount && <p className="text-red-400 text-sm">{errors.initialFundAmount}</p>}
                </div>

                {/* Duration & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-white">Thời gian thực hiện</Label>
                    <Select
                      value={form.duration}
                      onValueChange={(value) => handleSelectChange('duration', value)}
                    >
                      <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.duration ? 'border-red-500/50' : ''}`}>
                        <SelectValue placeholder="Chọn thời gian" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {durations.map((duration) => (
                          <SelectItem key={duration.value} value={duration.value} className="text-white hover:bg-gray-800">
                            {duration.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.duration && <p className="text-red-400 text-sm">{errors.duration}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Hình thức làm việc</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {locations.map((loc) => {
                        const Icon = loc.icon;
                        return (
                          <Button
                            key={loc.value}
                            type="button"
                            variant={form.location === loc.value ? 'default' : 'outline'}
                            className={`flex flex-col items-center gap-1 h-auto py-2 ${form.location === loc.value ? 'bg-blue-600 text-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                            onClick={() => handleSelectChange('location', loc.value)}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-xs">{loc.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                    {errors.location && <p className="text-red-400 text-sm">{errors.location}</p>}
                  </div>
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <Label className="text-white">Tài liệu đính kèm</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-4">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <div className="text-sm text-gray-400">
                        Kéo thả file hoặc click để chọn
                      </div>
                      <Input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        Chọn file
                      </Button>
                    </div>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/10 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-white">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileRemove(index)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Immediate Start */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="immediate"
                    checked={form.immediate}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, immediate: checked }))}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="immediate" className="text-white">Cần bắt đầu ngay</Label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      Đăng dự án
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PostJob;